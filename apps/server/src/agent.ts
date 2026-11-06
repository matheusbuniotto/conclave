import { db, users, messages } from "@conclave/db";
import { eq } from "drizzle-orm";
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

  // 1. Find the workspace agent user
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.userType, "agent"));

  if (!agent) {
    console.log("No agent user found in database");
    return;
  }

  // Prevent bot from answering its own messages
  if (senderId && agent.id === senderId) {
    return;
  }

  // Check if message is addressed to agent or requests an action
  const isDirectlyMentioned = /@?(agent|bot|conclave|assistant|claude|agy)/i.test(userMessage);
  const isBuildRequest = /(build|create|make|generate).*(app|tracker|dashboard|tool|crm|widget|counter|calc|kanban)/i.test(userMessage);
  const isExecRequest = /^(run|exec|execute|python|sqlite|bash|sh)\b/i.test(userMessage.replace(/@?(agent|bot|conclave|assistant)/gi, "").trim());

  if (!isDirectlyMentioned && !isBuildRequest && !isExecRequest) {
    return;
  }

  console.log(`Agent loop invoked for message: "${userMessage}"`);

  // Choose engine
  const prefersClaude = /claude/i.test(userMessage) || !!process.env.ANTHROPIC_API_KEY;
  const engineName = prefersClaude ? "Claude Code" : "Google Antigravity (agy)";

  // 2. Immediately send thinking placeholder to the chat feed for instant feedback!
  const [placeholderMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId,
      senderId: agent.id,
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
          id: agent.id,
          displayName: agent.displayName,
          avatarUrl: agent.avatarUrl,
          userType: agent.userType,
        },
        reactions: [],
      },
    })
  );

  try {
    // 3. Obtain isolated Sandbox for this workspace & agent
    const compute = await getComputeProvider();
    const sandbox: SandboxInstance = await compute.getOrCreateSandbox(workspaceId, agent.id);

    // Enrich prompt for in-chat app building
    let finalPrompt = userMessage;
    if (isBuildRequest) {
      finalPrompt = `${userMessage}\n\nIMPORTANT: Build this as an interactive web app saved directly to index.html with inline styles (Tailwind via CDN) and vanilla JS so it can be served as a micro-app inside the workspace.`;
    }

    // 4. Run the underlying agent engine (Claude Code or agy)
    const result = await runAgentEngine({
      workDir: sandbox.workDir,
      prompt: finalPrompt,
      engine: prefersClaude ? "claude" : "agy",
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log(`✓ Engine (${result.engineUsed}) finished in ${result.durationSeconds}s. Has artifact: ${result.hasArtifact}`);

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
        : "Interactive Mini-Tool";

      metadata = {
        type: "interactive_app",
        appTitle,
        appUrl: `http://localhost:${sandbox.hostPort}`,
        containerPort: sandbox.hostPort,
        sandboxId: sandbox.id,
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
            id: agent.id,
            displayName: agent.displayName,
            avatarUrl: agent.avatarUrl,
            userType: agent.userType,
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
