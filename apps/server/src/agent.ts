import { db, users, messages } from "@conclave/db";
import { eq, and } from "drizzle-orm";
import { getComputeProvider, type SandboxInstance } from "@conclave/compute";
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

  console.log(`🤖 Agent triggered for message: "${userMessage}"`);

  // 2. Obtain isolated Sandbox for this workspace & agent
  const compute = await getComputeProvider();
  const sandbox: SandboxInstance = await compute.getOrCreateSandbox(workspaceId, agent.id);

  let replyContent = "";
  let metadata: Record<string, unknown> = {};

  if (isBuildRequest) {
    // Generate an in-chat interactive mini-app in the sandbox!
    const appTitle = userMessage.includes("tracker")
      ? "Team Task Tracker"
      : userMessage.includes("crm")
      ? "Mini CRM"
      : "Interactive Mini-Tool";

    const appHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-800 p-4 font-sans select-none">
  <div class="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-4">
    <div class="flex items-center justify-between border-b pb-3 mb-3">
      <h2 class="font-bold text-base text-slate-900">${appTitle}</h2>
      <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Active MicroVM</span>
    </div>

    <div class="flex gap-2 mb-3">
      <input id="itemInput" type="text" placeholder="Add new item..." class="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
      <button onclick="addItem()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Add</button>
    </div>

    <ul id="itemList" class="space-y-1.5 text-sm">
      <li class="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
        <span>🚀 Review Conclave microVM architecture</span>
        <span class="text-xs text-slate-400">Done</span>
      </li>
      <li class="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
        <span>📦 Test Docker Sandbox provider</span>
        <span class="text-xs text-amber-500 font-medium">In Progress</span>
      </li>
    </ul>
  </div>

  <script>
    function addItem() {
      const input = document.getElementById('itemInput');
      const val = input.value.trim();
      if (!val) return;
      const list = document.getElementById('itemList');
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100';
      li.innerHTML = '<span>' + val + '</span><span class="text-xs text-blue-500 font-medium">New</span>';
      list.prepend(li);
      input.value = '';
    }
  </script>
</body>
</html>`;

    // Write file into sandbox
    await compute.writeFile(sandbox.id, "index.html", appHtml);

    // Launch static server inside container
    await compute.execDetached(sandbox.id, "serve -s . -l 3000");

    const previewUrl = `http://localhost:${sandbox.hostPort}`;

    replyContent = `I have built and deployed **${appTitle}** inside your workspace sandbox! ✨\n\nIt is running live in an isolated container environment. You can interact with it below or preview it directly.`;
    metadata = {
      type: "interactive_app",
      appTitle,
      appUrl: previewUrl,
      sandboxId: sandbox.id,
      containerPort: sandbox.hostPort,
    };
  } else if (isExecRequest) {
    // Execute command inside sandbox
    const cmd = userMessage.replace(/^(run|exec|execute)\s+/i, "");
    const res = await compute.exec(sandbox.id, cmd);
    replyContent = `Executed command inside sandbox:\n\`\`\`bash\n${cmd}\n\`\`\`\n**Output:**\n\`\`\`\n${res.stdout || res.stderr || "(No output)"}\n\`\`\``;
  } else {
    // General conversational reply
    replyContent = `Hello! I'm your Conclave AI agent running inside an isolated sandbox on this workspace. 

I can:
- **Build in-chat apps** (e.g. *"build a task tracker"* or *"create a CRM"*)
- **Run isolated code** (e.g. *"run python3 -c 'print(2**10)'"* or *"run sqlite3 test.db 'CREATE TABLE ...'"*)
- Answer questions and coordinate tasks for the team.`;
  }

  // 3. Save agent message to DB
  const [createdMsg] = await db
    .insert(messages)
    .values({
      workspaceId,
      channelId,
      senderId: agent.id,
      parentMessageId: parentMessageId || null,
      content: replyContent,
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

  // 4. Broadcast to Redis bus
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
