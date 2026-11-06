import { db, users, messages, bots, channelMembers } from "@conclave/db";
import { eq, and } from "drizzle-orm";
import { getComputeProvider, runAgentEngine, type SandboxInstance } from "@conclave/compute";
import Redis from "ioredis";

export async function handleAgentResponse(options: {
  workspaceId: string;
  channelId: string;
  userMessage: string;
  parentMessageId?: string | null;
  senderId?: string;
  redisPublisher: Redis;
}) {
  const { workspaceId, channelId, userMessage, parentMessageId, senderId, redisPublisher } = options;

  // 1. Find all bots currently assigned to this channel
  const channelBots = await db
    .select({
      botId: bots.id,
      userId: bots.userId,
      name: bots.name,
      handle: bots.handle,
      description: bots.description,
      systemPrompt: bots.systemPrompt,
      engine: bots.engine,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      userType: users.userType,
    })
    .from(channelMembers)
    .innerJoin(bots, eq(channelMembers.userId, bots.userId))
    .innerJoin(users, eq(bots.userId, users.id))
    .where(eq(channelMembers.channelId, channelId));

  if (channelBots.length === 0) {
    // No bots are members of this channel
    return;
  }

  // Prevent any bot from answering its own messages
  if (senderId && channelBots.some((b) => b.userId === senderId)) {
    return;
  }

  // Check which bot (if any) is addressed
  const matchedBot = channelBots.find((b) => {
    const handleRegex = new RegExp(`@?(${b.handle}|${b.name.replace(/\s+/g, "")})`, "i");
    return handleRegex.test(userMessage);
  });

  const isGeneralBotMention = /@?(agent|bot|conclave|assistant)/i.test(userMessage);
  const isBuildRequest = /(build|create|make|generate).*(app|tracker|dashboard|tool|crm|widget|counter|calc|kanban)/i.test(userMessage);
  const isExecRequest = /^(run|exec|execute|python|sqlite|bash|sh)\b/i.test(userMessage.replace(/@?(agent|bot|conclave|assistant)/gi, "").trim());

  if (!matchedBot && !isGeneralBotMention && !isBuildRequest && !isExecRequest) {
    return;
  }

  // Target bot: matched bot or fallback to first channel bot
  const targetBot = matchedBot || channelBots[0];

  console.log(`Agent loop invoked for bot "${targetBot.name}" (@${targetBot.handle}) with message: "${userMessage}"`);

  // Choose engine: message override, or bot configured engine, or default agy
  const prefersClaude = /claude/i.test(userMessage) || (targetBot.engine === "claude" && !/agy/i.test(userMessage));
  const engineName = prefersClaude ? "Claude Code" : "Google Antigravity (agy)";

  // 2. Immediately send thinking placeholder to the chat feed for instant feedback!
  const [placeholderMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId,
      senderId: targetBot.userId,
      parentMessageId: parentMessageId || null,
      content: `Building in sandbox with ${engineName}...`,
      metadata: { status: "thinking" },
    })
    .returning();

  // Broadcast initial message
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
          displayName: targetBot.displayName,
          avatarUrl: targetBot.avatarUrl,
          userType: targetBot.userType,
        },
        reactions: [],
      },
    })
  );

  try {
    // 3. Obtain isolated Sandbox for this workspace & bot
    const compute = await getComputeProvider();
    const sandbox: SandboxInstance = await compute.getOrCreateSandbox(workspaceId, targetBot.userId);

    // Enrich prompt with bot system prompt and build instructions
    let finalPrompt = userMessage;
    if (targetBot.systemPrompt) {
      finalPrompt = `System instructions: ${targetBot.systemPrompt}\n\nUser request: ${userMessage}`;
    }
    if (isBuildRequest) {
      finalPrompt = `${finalPrompt}\n\nIMPORTANT: Build this as an interactive web app saved directly to index.html with inline styles (Tailwind via CDN) and vanilla JS so it can be served as a micro-app inside the workspace.`;
    }

    // 4. Run the underlying agent engine (Claude Code or agy)
    const result = await runAgentEngine({
      workDir: sandbox.workDir,
      prompt: finalPrompt,
      engine: prefersClaude ? "claude" : "agy",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log(`✓ Engine (${result.engineUsed}) for ${targetBot.name} finished in ${result.durationSeconds}s. Has artifact: ${result.hasArtifact}`);

    let metadata: Record<string, unknown> = {};

    if (result.hasArtifact || isBuildRequest) {
      // Launch server inside the container
      await compute.execDetached(sandbox.id, "npx serve -s /workspace -l 3000");

      const appTitle = userMessage.includes("crm")
        ? "Team CRM"
        : userMessage.includes("kanban")
        ? "Team Kanban Board"
        : userMessage.includes("tracker")
        ? "Team Task Tracker"
        : `${targetBot.name} App`;

      metadata = {
        type: "interactive_app",
        appTitle,
        appUrl: `http://localhost:${sandbox.hostPort}`,
        containerPort: sandbox.hostPort,
        sandboxId: sandbox.id,
        botId: targetBot.botId,
        engine: result.engineUsed,
        duration: `${result.durationSeconds.toFixed(1)}s`,
      };
    }

    // 5. Update placeholder message with final response
    const [updatedMsg] = await db
      .update(messages)
      .set({
        content: result.text,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, placeholderMsg.id))
      .returning();

    // Broadcast updated message
    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.updated",
        channelId,
        parentMessageId: parentMessageId || null,
        data: {
          ...updatedMsg,
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
  } catch (err: any) {
    console.error("Agent error:", err);
    await db
      .update(messages)
      .set({
        content: `Sorry, I encountered an error while processing with ${engineName}: ${err.message || String(err)}`,
        metadata: { error: true },
        updatedAt: new Date(),
      })
      .where(eq(messages.id, placeholderMsg.id));

    await redisPublisher.publish(
      "conclave:events",
      JSON.stringify({
        type: "message.updated",
        channelId,
        parentMessageId: parentMessageId || null,
        data: { id: placeholderMsg.id },
      })
    );
  }
}
