import { db, users, messages } from "@conclave/db";
import { eq } from "drizzle-orm";
import { getComputeProvider, AcpClient, type SandboxInstance, type AcpUpdateNotification } from "@conclave/compute";
import Redis from "ioredis";

export async function handleAgentResponse(options: {
  workspaceId: string;
  channelId: string;
  userMessage: string;
  parentMessageId?: string | null;
  redisPublisher: Redis;
}) {
  const { workspaceId, channelId, userMessage, parentMessageId, redisPublisher } = options;

  // 1. Find the workspace agent user
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.userType, "agent"));

  if (!agent) {
    console.log("No agent user found in database");
    return;
  }

  // Check if message is addressed to agent or requests an action
  const isDirectlyMentioned = /@?(agent|bot|conclave|assistant)/i.test(userMessage);
  const isBuildRequest = /(build|create|make|generate).*(app|tracker|dashboard|tool|crm|widget|counter|calc)/i.test(userMessage);
  const isExecRequest = /^(run|exec|execute|python|sqlite|bash|sh)\b/i.test(userMessage.replace(/@?(agent|bot|conclave|assistant)/gi, "").trim());

  if (!isDirectlyMentioned && !isBuildRequest && !isExecRequest) {
    return;
  }

  console.log(`🤖 ACP Agent triggered for message: "${userMessage}"`);

  // 2. Obtain isolated Sandbox for this workspace & agent
  const compute = await getComputeProvider();
  const sandbox: SandboxInstance = await compute.getOrCreateSandbox(workspaceId, agent.id);

  // 3. Connect via ACP (Agent Client Protocol)
  const acp = new AcpClient(sandbox.id);
  await acp.start();

  await acp.initialize({
    protocolVersion: "2024-11-05",
    clientInfo: { name: "conclave-server", version: "0.1.0" },
    workspaceRoot: "/workspace",
  });

  // Resolve auth: check if user provided a BYOK key or uses Subscription
  const byokKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  const authMode = byokKey ? "byok" : "subscription";

  const sessionId = `sess-${Date.now()}`;
  await acp.createSession({
    sessionId,
    workspaceId,
    channelId,
    auth: {
      type: authMode,
      apiKey: byokKey,
      subscriptionToken: authMode === "subscription" ? "sub_conclave_tier_team" : undefined,
    },
  });

  let fullText = "";
  let metadata: Record<string, unknown> = {};

  // Listen to streaming ACP notifications
  acp.on("update", (update: AcpUpdateNotification) => {
    if (update.type === "text_delta" && update.delta) {
      fullText += update.delta;
    } else if (update.type === "artifact" && update.artifact) {
      metadata = {
        type: "interactive_app",
        appTitle: update.artifact.title,
        appUrl: `http://localhost:${sandbox.hostPort}`,
        containerPort: sandbox.hostPort,
        sandboxId: sandbox.id,
        protocol: "ACP-v1",
      };
    }
  });

  // Send the prompt
  await acp.prompt({
    sessionId,
    prompt: userMessage,
  });

  // Wait briefly for completion
  await new Promise((resolve) => setTimeout(resolve, 800));
  acp.close();

  // 4. Save agent message to DB
  const [createdMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId,
      senderId: agent.id,
      parentMessageId: parentMessageId || null,
      content: fullText.trim() || "Task completed via ACP.",
      metadata,
    })
    .returning();

  // If reply to thread, increment reply count
  if (parentMessageId) {
    const [parent] = await db.select().from(messages).where(eq(messages.id, parentMessageId));
    if (parent) {
      await db
        .update(messages)
        .set({
          replyCount: (parent.replyCount || 0) + 1,
          lastReplyAt: new Date(),
        })
        .where(eq(messages.id, parentMessageId));
    }
  }

  const payload = {
    ...createdMsg,
    sender: {
      id: agent.id,
      displayName: agent.displayName,
      avatarUrl: agent.avatarUrl,
      userType: agent.userType,
    },
    reactions: [],
  };

  // 5. Broadcast to Redis bus
  await redisPublisher.publish(
    "conclave:events",
    JSON.stringify({
      type: "message.created",
      channelId,
      parentMessageId: parentMessageId || null,
      data: payload,
    })
  );
}
