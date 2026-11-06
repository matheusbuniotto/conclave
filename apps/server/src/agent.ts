import {
  db,
  users,
  messages,
  bots,
  channelMembers,
  workspaceApps,
  appVersions,
  appRecords,
  feedItems,
} from "@conclave/db";
import { eq, desc } from "drizzle-orm";
import {
  getComputeProvider,
  wakeMainAgentMemory,
  recordMainAgentNote,
  getContextCompactionState,
  compactMainAgentContext,
  delegateTaskToSubprocess,
  type SandboxInstance,
} from "@conclave/compute";
import Redis from "ioredis";

export interface LiveStepItem {
  id: string;
  kind: "tool" | "subagent" | "shell";
  label: string;
  detail?: string;
  task?: string;
  status: "running" | "done" | "failed";
  duration?: string;
  stepsCount?: number;
}

// Active turn registry so any human in the channel can click "Stop" (Laze /stop ergonomics)
const activeTurnControllers = new Map<
  string,
  { aborted: boolean; botName: string; messageId: string }
>();

export function stopActiveChannelTurn(channelId: string): {
  stopped: boolean;
  botName?: string;
  messageId?: string;
} {
  const controller = activeTurnControllers.get(channelId);
  if (!controller) return { stopped: false };
  controller.aborted = true;
  activeTurnControllers.delete(channelId);
  return {
    stopped: true,
    botName: controller.botName,
    messageId: controller.messageId,
  };
}

export async function handleAgentResponse(options: {
  workspaceId: string;
  channelId: string;
  userMessage: string;
  parentMessageId?: string | null;
  senderId?: string;
  redisPublisher: Redis;
}) {
  const {
    workspaceId,
    channelId,
    userMessage,
    parentMessageId,
    senderId,
    redisPublisher,
  } = options;

  // Handle "/stop" slash command directly
  if (userMessage.trim().toLowerCase() === "/stop") {
    const res = stopActiveChannelTurn(channelId);
    if (res.stopped && res.messageId) {
      await db
        .update(messages)
        .set({
          content: `⏹️ Turn stopped by user.`,
          metadata: { status: "stopped" },
          updatedAt: new Date(),
        })
        .where(eq(messages.id, res.messageId));
      await redisPublisher.publish(
        "conclave:events",
        JSON.stringify({
          type: "message.updated",
          channelId,
          parentMessageId: parentMessageId || null,
          data: { id: res.messageId },
        })
      );
    }
    return;
  }

  // 1. Find all bots currently assigned to this channel (including listenMode)
  const channelBots = await db
    .select({
      botId: bots.id,
      userId: bots.userId,
      name: bots.name,
      handle: bots.handle,
      description: bots.description,
      systemPrompt: bots.systemPrompt,
      engine: bots.engine,
      listenMode: channelMembers.listenMode,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      userType: users.userType,
    })
    .from(channelMembers)
    .innerJoin(bots, eq(channelMembers.userId, bots.userId))
    .innerJoin(users, eq(bots.userId, users.id))
    .where(eq(channelMembers.channelId, channelId));

  if (channelBots.length === 0) {
    return;
  }

  // Prevent any bot from answering its own messages
  if (senderId && channelBots.some((b) => b.userId === senderId)) {
    return;
  }

  // Check which bot (if any) is explicitly @mentioned
  const matchedBot = channelBots.find((b) => {
    const handleRegex = new RegExp(
      `@?(${b.handle}|${b.name.replace(/\s+/g, "")})`,
      "i"
    );
    return handleRegex.test(userMessage);
  });

  const isCompactCommand = /^(\/compact|\/nap)\b/i.test(
    userMessage.replace(/@[a-z0-9_-]+/gi, "").trim()
  );
  const isGeneralBotMention = /@?(agent|bot|conclave|assistant)/i.test(
    userMessage
  );
  const isBuildRequest =
    /(build|create|make|generate|update|add.*column).*(app|tracker|dashboard|tool|crm|widget|counter|calc|kanban|planner|board|table)/i.test(
      userMessage
    );
  const isExecRequest = /^(run|exec|execute|python|sqlite|bash|sh)\b/i.test(
    userMessage.replace(/@?(agent|bot|conclave|assistant)/gi, "").trim()
  );
  const isDraftRequest = /(draft|email|reply to|send.*message|remind)/i.test(
    userMessage
  );
  const listeningAllBot = channelBots.find((b) => b.listenMode === "all");

  if (
    !matchedBot &&
    !isCompactCommand &&
    !isGeneralBotMention &&
    !isBuildRequest &&
    !isExecRequest &&
    !listeningAllBot
  ) {
    return;
  }

  const targetBot = matchedBot || listeningAllBot || channelBots[0];
  const prefersClaude =
    /claude/i.test(userMessage) ||
    (targetBot.engine === "claude" && !/agy/i.test(userMessage));
  const engineName = prefersClaude
    ? "Claude Code"
    : "Google Antigravity (agy)";

  // Fetch recent channel history for rolling context compaction check
  const recentChannelRows = await db
    .select({
      content: messages.content,
      senderName: users.displayName,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.createdAt))
    .limit(12);

  const recentTurns = recentChannelRows
    .reverse()
    .map((r) => ({ sender: r.senderName, content: r.content }));

  // Handle explicit `/compact` or `/nap` command
  if (isCompactCommand) {
    const compactRes = compactMainAgentContext({
      botHandle: targetBot.handle,
      channelId,
      messagesToCompact: recentTurns,
      reason: "Manual /compact command",
    });
    const wakeRes = wakeMainAgentMemory(targetBot.handle);

    const compactSteps: LiveStepItem[] = [
      {
        id: "step-compact-ctx",
        kind: "tool",
        label: `Compact channel context (+compact #${compactRes.compaction.compactionRuns})`,
        detail: `Compressed ${recentTurns.length} recent turns → ${compactRes.compaction.estimatedContextTokens} tokens (${compactRes.compaction.maxContextTokens} budget)`,
        status: "done",
        duration: "0.2s",
      },
      {
        id: "step-optmem-note",
        kind: "tool",
        label: `memo note #${compactRes.noteRecorded.noteId} & memo nap binary tree settle`,
        detail:
          compactRes.settledNaps.length > 0
            ? `Settled binary merge tree blocks: ${compactRes.settledNaps
                .map((n) => `#${n.blockId}`)
                .join(", ")}`
            : `All ${wakeRes.treeNodesCount} binary merge tree blocks settled`,
        status: "done",
        duration: "0.1s",
      },
    ];

    const [compactMsg] = await db
      .insert(messages)
      .values({
        workspaceId,
        channelId,
        senderId: targetBot.userId,
        parentMessageId: parentMessageId || null,
        content: [
          `🧹 **Context & OptMem Binary Tree Compacted** (\`@${targetBot.handle}\`)`,
          ``,
          `- **OptMem Permanent Store**: \`${wakeRes.totalMemories} memories\` across \`${wakeRes.treeNodesCount}\` binary merge tree summaries (\`O(log N)\` wake context)`,
          `- **Active Context Window**: \`${compactRes.compaction.estimatedContextTokens} / ${compactRes.compaction.maxContextTokens} tokens\` (compaction run \`#${compactRes.compaction.compactionRuns}\`)`,
          `- **Rolling Context Summary**: _${compactRes.compaction.rollingSummary}_`,
          `- **Subprocess Policy**: Main agent orchestrates memory & context only; all execution tasks are delegated to isolated subprocesses (\`You are a subagent. Don't run memo.\`).`,
        ].join("\n"),
        metadata: {
          engine: prefersClaude ? "claude" : "agy",
          duration: "0.3s",
          steps: compactSteps,
          optmem: {
            botHandle: targetBot.handle,
            noteId: compactRes.noteRecorded.noteId,
            totalMemories: wakeRes.totalMemories,
            treeNodesCount: wakeRes.treeNodesCount,
            contextTokens: compactRes.compaction.estimatedContextTokens,
          },
        },
      })
      .returning();

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.created",
        channelId,
        parentMessageId: parentMessageId || null,
        data: {
          ...compactMsg,
          sender: {
            id: targetBot.userId,
            displayName: targetBot.displayName,
            avatarUrl: targetBot.avatarUrl,
            userType: targetBot.userType,
          },
          reactions: [],
        },
      })
    );
    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "optmem.updated",
        workspaceId,
        botHandle: targetBot.handle,
      })
    );
    return;
  }

  // Step 1: Mandatory `memo wake` + Automatic Context Compaction check
  const wakeRes = wakeMainAgentMemory(targetBot.handle);
  let compactionState = getContextCompactionState(
    targetBot.handle,
    channelId,
    recentTurns
  );
  let autoCompacted = false;

  if (
    recentTurns.length >= 10 ||
    compactionState.estimatedContextTokens > 4500
  ) {
    const autoRes = compactMainAgentContext({
      botHandle: targetBot.handle,
      channelId,
      messagesToCompact: recentTurns.slice(0, -3),
      reason: "Auto threshold compaction",
    });
    compactionState = autoRes.compaction;
    autoCompacted = true;
  }

  const liveSteps: LiveStepItem[] = [
    {
      id: "step-wake",
      kind: "tool",
      label: `memo wake (@${targetBot.handle}) + Three-Tier Memory sync`,
      detail: `${wakeRes.totalMemories} memories · ${wakeRes.treeNodesCount} binary tree nodes · ${compactionState.estimatedContextTokens} ctx tokens${
        autoCompacted ? " (auto-compacted)" : ""
      }`,
      status: "done",
      duration: "0.1s",
    },
  ];

  // 2. Immediately send thinking placeholder with live steps to chat feed
  const [placeholderMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId,
      senderId: targetBot.userId,
      parentMessageId: parentMessageId || null,
      content: `${targetBot.name} woke OptMem (${wakeRes.totalMemories} memories) and is delegating to an isolated subprocess...`,
      metadata: {
        status: "thinking",
        engine: prefersClaude ? "claude" : "agy",
        startedAt: Date.now(),
        steps: liveSteps,
      },
    })
    .returning();

  const turnController = {
    aborted: false,
    botName: targetBot.name,
    messageId: placeholderMsg.id,
  };
  activeTurnControllers.set(channelId, turnController);

  const broadcastUpdate = async (
    content: string,
    metadata: Record<string, unknown>
  ) => {
    const [updated] = await db
      .update(messages)
      .set({ content, metadata, updatedAt: new Date() })
      .where(eq(messages.id, placeholderMsg.id))
      .returning();

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.updated",
        channelId,
        parentMessageId: parentMessageId || null,
        data: {
          ...updated,
          sender: {
            id: targetBot.userId,
            displayName: targetBot.displayName,
            avatarUrl: targetBot.avatarUrl,
            userType: targetBot.userType,
          },
          reactions: [],
        },
      })
    );
  };

  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "message.created",
      channelId,
      parentMessageId: parentMessageId || null,
      data: {
        ...placeholderMsg,
        sender: {
          id: targetBot.userId,
          displayName: targetBot.avatarUrl,
          avatarUrl: targetBot.avatarUrl,
          userType: targetBot.userType,
        },
        reactions: [],
      },
    })
  );

  try {
    // Classify task kind for isolated subprocess delegation
    const taskKind =
      isDraftRequest && !isBuildRequest
        ? "draft_comms"
        : isBuildRequest
        ? "app_build"
        : isExecRequest
        ? "code_exec"
        : "analysis";

    const subagentLabel =
      taskKind === "app_build"
        ? "Subprocess: App Kit & Reactive DB Builder"
        : taskKind === "draft_comms"
        ? "Subprocess: External Comms Guardrail Worker"
        : taskKind === "code_exec"
        ? "Subprocess: Sandbox Code & Shell Runner"
        : "Subprocess: Domain Telemetry & Analysis Worker";

    const subagentStepId = `step-subproc-${Date.now()}`;
    liveSteps.push({
      id: subagentStepId,
      kind: "subagent",
      label: subagentLabel,
      task: `OPTMEM_SUBAGENT=1 ("You are a subagent. Don't run memo.") · Task: "${userMessage.slice(
        0,
        64
      )}"`,
      status: "running",
      stepsCount: 1,
    });

    await broadcastUpdate(
      `${targetBot.name} delegated task to isolated ${subagentLabel}...`,
      {
        status: "thinking",
        steps: liveSteps,
      }
    );

    let sandbox: SandboxInstance | null = null;
    try {
      const compute = await getComputeProvider();
      sandbox = await compute.getOrCreateSandbox(workspaceId, targetBot.userId);
    } catch {
      sandbox = null;
    }

    // Step 2: Execute concrete work in an isolated OS subprocess (`delegateTaskToSubprocess`)
    // so the Main Agent's context window remains 100% clean and compact!
    const subRes = await delegateTaskToSubprocess({
      botHandle: targetBot.handle,
      botName: targetBot.name,
      channelId,
      taskKind,
      userMessage,
      systemPrompt: targetBot.systemPrompt || undefined,
      wakeContextSnippet: wakeRes.wakeOutput,
      compactedContextSummary: compactionState.rollingSummary,
      workDir: sandbox?.workDir || `/tmp/conclave-subproc-${targetBot.handle}`,
      engine: prefersClaude ? "claude" : "agy",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    if (turnController.aborted) return;

    // Update the subagent step with real subprocess PID, internal step count, and duration
    const subStep = liveSteps.find((s) => s.id === subagentStepId);
    if (subStep) {
      subStep.status = "done";
      subStep.label = `${subRes.subagentRole} (PID ${subRes.pid})`;
      subStep.task = `OPTMEM_SUBAGENT=1 ("${subRes.optmemGuard}") · Returned clean summary (${subRes.internalSteps
        .map((s) => s.label)
        .join(" → ")})`;
      subStep.stepsCount = subRes.internalSteps.length;
      subStep.duration = `${(subRes.durationMs / 1000).toFixed(1)}s`;
    }

    // Step 3: Main Agent records a single 1-line durable memory (`memo note`) and
    // automatically settles any due binary merge tree compressions (`memo nap`)
    const noteRes = recordMainAgentNote(
      targetBot.handle,
      subRes.suggestedMemoryNote
    );

    liveSteps.push({
      id: `step-note-${noteRes.noteId}`,
      kind: "tool",
      label: `memo note #${noteRes.noteId}${
        noteRes.settledNaps.length > 0
          ? ` + memo nap (${noteRes.settledNaps
              .map((n) => `#${n.blockId}`)
              .join(", ")})`
          : ""
      }`,
      detail: noteRes.savedLine,
      status: "done",
      duration: "0.1s",
    });

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "optmem.updated",
        workspaceId,
        botHandle: targetBot.handle,
      })
    );

    // Handle Draft Comms Guardrail result from subprocess
    if (subRes.draftCard) {
      const attentionId = `att-${Date.now()}`;
      const draftCard = {
        id: attentionId,
        kind: "draft",
        status: "pending",
        title: subRes.draftCard.title,
        summary: subRes.draftCard.summary,
        draftHeader: subRes.draftCard.draftHeader,
        draftBody: subRes.draftCard.draftBody,
        deciders: ["Mara Jensen", "Tom Reyes"],
      };

      await db.insert(feedItems).values({
        workspaceId,
        channelId,
        messageId: placeholderMsg.id,
        botId: targetBot.botId,
        kind: "draft",
        priority: "high",
        title: draftCard.title,
        summary: draftCard.summary,
        draftHeader: draftCard.draftHeader,
        draftBody: draftCard.draftBody,
        status: "pending",
      });

      await broadcastUpdate(subRes.cleanSummary, {
        engine: subRes.engineUsed,
        duration: `${((subRes.durationMs + 200) / 1000).toFixed(1)}s`,
        steps: liveSteps,
        attention: draftCard,
        optmem: {
          botHandle: targetBot.handle,
          noteId: noteRes.noteId,
          settledNaps: noteRes.settledNaps,
          subprocessPid: subRes.pid,
          contextTokens: compactionState.estimatedContextTokens,
        },
      });

      await redisPublisher.publish(
        "conclave:events",
        JSON.stringify({ type: "feed.updated", workspaceId })
      );
      return;
    }

    let metadata: Record<string, unknown> = {
      engine: subRes.engineUsed,
      duration: `${((subRes.durationMs + 200) / 1000).toFixed(1)}s`,
      steps: liveSteps,
      optmem: {
        botHandle: targetBot.handle,
        noteId: noteRes.noteId,
        settledNaps: noteRes.settledNaps,
        subprocessPid: subRes.pid,
        contextTokens: compactionState.estimatedContextTokens,
      },
    };

    // Handle App Build artifact returned by subprocess
    if (subRes.artifact) {
      const { appSlug, appTitle, htmlContent, seedRecords } = subRes.artifact;

      const [createdApp] = await db
        .insert(workspaceApps)
        .values({
          workspaceId,
          channelId,
          botId: targetBot.botId,
          slug: appSlug,
          title: appTitle,
          description: `Generated by @${targetBot.handle} subprocess (PID ${subRes.pid})`,
          icon: "app-window",
          status: "published",
          accessLevel: "workspace",
          isPinned: true,
          currentVersion: 1,
          appUrl: `/api/apps/${appSlug}/render`,
          containerPort: sandbox?.hostPort || 3001,
          sandboxId: sandbox?.id,
        })
        .returning();

      await db.insert(appVersions).values({
        appId: createdApp.id,
        version: 1,
        summary: `Initial version built by @${targetBot.handle} subprocess PID ${subRes.pid}`,
        htmlContent,
        createdById: targetBot.userId,
      });

      if (seedRecords.length > 0) {
        await db.insert(appRecords).values(
          seedRecords.map((rec) => ({
            appId: createdApp.id,
            collection: "items",
            environment: "live",
            data: rec,
            createdById: targetBot.userId,
          }))
        );
      }

      liveSteps.push({
        id: "step-push",
        kind: "tool",
        label: `conclave app push ${appSlug} --pin`,
        detail: `Published v1 from subprocess PID ${subRes.pid} and pinned to channel`,
        status: "done",
        duration: "0.1s",
      });

      metadata = {
        ...metadata,
        type: "interactive_app",
        appId: createdApp.id,
        appSlug: createdApp.slug,
        appTitle,
        appUrl: `/api/apps/${appSlug}/render`,
        containerPort: sandbox?.hostPort || 3001,
        version: 1,
        steps: liveSteps,
      };

      await redisPublisher.publish(
        "conclave:events",
        JSON.stringify({ type: "app.updated", workspaceId, channelId })
      );
    }

    await broadcastUpdate(subRes.cleanSummary, metadata);
  } catch (err: any) {
    console.error("Agent error:", err);
    await broadcastUpdate(
      `Sorry, I encountered an error while processing with ${engineName}: ${
        err.message || String(err)
      }`,
      { error: true, steps: liveSteps }
    );
  } finally {
    activeTurnControllers.delete(channelId);
  }
}
