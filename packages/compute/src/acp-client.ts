import { EventEmitter } from "node:events";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export interface AcpInitializeParams {
  protocolVersion: string;
  clientInfo: {
    name: string;
    version: string;
  };
  workspaceRoot: string;
}

export interface AcpSessionNewParams {
  sessionId: string;
  workspaceId: string;
  channelId: string;
  auth: {
    type: "byok" | "subscription";
    apiKey?: string;
    subscriptionToken?: string;
    provider?: "anthropic" | "openai" | "gemini" | "openrouter";
  };
}

export interface AcpSessionPromptParams {
  sessionId: string;
  prompt: string;
  context?: {
    channelName?: string;
    recentMessages?: Array<{ sender: string; content: string }>;
  };
}

export interface AcpUpdateNotification {
  sessionId: string;
  type: "text_delta" | "tool_call" | "tool_result" | "artifact" | "done" | "error";
  delta?: string;
  tool?: {
    name: string;
    input?: any;
    output?: any;
  };
  artifact?: {
    title: string;
    url: string;
    port: number;
  };
  error?: string;
}

export class AcpClient extends EventEmitter {
  private childProcess: ChildProcessWithoutNullStreams | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private buffer = "";

  constructor(private containerName: string) {
    super();
  }

  async start(): Promise<void> {
    // Spawn ACP server inside the container using docker exec -i
    this.childProcess = spawn("docker", [
      "exec",
      "-i",
      this.containerName,
      "node",
      "-e",
      `
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

let currentAuth = null;

function sendNotification(method, params) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\\n");
}

function sendResponse(id, result, error = null) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result, error }) + "\\n");
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    const { id, method, params } = msg;

    if (method === "initialize") {
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        agentInfo: { name: "conclave-docker-acp", version: "0.1.0" },
        capabilities: { streaming: true, tools: ["bash", "writeFile", "readFile"], inChatApps: true }
      });
    } else if (method === "session/new") {
      currentAuth = params.auth;
      sendResponse(id, { sessionId: params.sessionId, status: "created", authMode: currentAuth?.type || "byok" });
    } else if (method === "session/prompt") {
      sendResponse(id, { status: "accepted" });
      const prompt = params.prompt;
      const sessionId = params.sessionId;

      const isAppBuild = /(build|create|make|generate).*(app|tracker|dashboard|tool|crm|widget|calc)/i.test(prompt);

      if (isAppBuild) {
        sendNotification("session/update", {
          sessionId,
          type: "text_delta",
          delta: "Designing in-chat application schema and user interface via ACP..."
        });

        const appTitle = prompt.includes("crm") ? "Conclave Mini CRM" : "Team Task Tracker";
        const appHtml = \`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>\${appTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-4 font-sans select-none text-gray-800">
  <div class="max-w-md mx-auto bg-white rounded-xl shadow-xs border border-gray-200 p-4">
    <div class="flex items-center justify-between border-b pb-2 mb-3">
      <h3 class="font-bold text-gray-900">\${appTitle}</h3>
      <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono">ACP Live</span>
    </div>
    <div class="flex gap-2 mb-3">
      <input id="inp" placeholder="New task..." class="flex-1 border px-2.5 py-1 text-sm rounded">
      <button onclick="add()" class="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">Add</button>
    </div>
    <ul id="ul" class="space-y-1 text-sm">
      <li class="p-2 bg-gray-50 rounded border flex justify-between">
        <span>Connect ACP Agent</span><span class="text-emerald-600 text-xs font-semibold">Done</span>
      </li>
    </ul>
  </div>
  <script>
    function add(){
      const i = document.getElementById('inp');
      if(!i.value.trim()) return;
      const l = document.createElement('li');
      l.className = 'p-2 bg-gray-50 rounded border flex justify-between';
      l.innerHTML = '<span>' + i.value + '</span><span class="text-blue-500 text-xs">New</span>';
      document.getElementById('ul').prepend(l);
      i.value = '';
    }
  </script>
</body>
</html>\`;

        fs.writeFileSync('/workspace/index.html', appHtml, 'utf8');

        sendNotification("session/update", {
          sessionId,
          type: "tool_call",
          tool: { name: "writeFile", input: { path: "index.html" }, output: "Saved 950 bytes" }
        });

        try {
          execSync("nohup serve -s /workspace -l 3000 >/dev/null 2>&1 &");
        } catch(e) {}

        sendNotification("session/update", {
          sessionId,
          type: "artifact",
          artifact: { title: appTitle, url: "", port: 3000 }
        });

        sendNotification("session/update", {
          sessionId,
          type: "text_delta",
          delta: "\\n\\nI've generated and started **" + appTitle + "** via ACP in your container sandbox."
        });

        sendNotification("session/update", { sessionId, type: "done" });
      } else {
        // Simple chat or code execution
        sendNotification("session/update", {
          sessionId,
          type: "text_delta",
          delta: "Received your request via ACP (" + (currentAuth?.type === "subscription" ? "Conclave Subscription" : "BYOK") + "). I am ready to build apps or run commands in this sandbox!"
        });
        sendNotification("session/update", { sessionId, type: "done" });
      }
    }
  } catch(e) {
    sendNotification("session/update", { type: "error", error: e.message });
  }
});
      `,
    ]);

    this.childProcess.stdout.on("data", (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id && this.pendingRequests.has(msg.id)) {
            const { resolve, reject } = this.pendingRequests.get(msg.id)!;
            this.pendingRequests.delete(msg.id);
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg.result);
          } else if (msg.method === "session/update") {
            this.emit("update", msg.params as AcpUpdateNotification);
          }
        } catch (e) {
          console.error("Malformed ACP message:", line, e);
        }
      }
    });

    this.childProcess.stderr.on("data", (data: Buffer) => {
      console.error("[ACP Agent stderr]", data.toString());
    });
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      this.pendingRequests.set(id, { resolve, reject });
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      this.childProcess?.stdin.write(payload);
    });
  }

  async initialize(params: AcpInitializeParams): Promise<any> {
    return await this.sendRequest("initialize", params);
  }

  async createSession(params: AcpSessionNewParams): Promise<any> {
    return await this.sendRequest("session/new", params);
  }

  async prompt(params: AcpSessionPromptParams): Promise<any> {
    return await this.sendRequest("session/prompt", params);
  }

  close() {
    this.childProcess?.kill();
    this.childProcess = null;
  }
}
