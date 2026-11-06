import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface AgentRunOptions {
  workDir: string;
  prompt: string;
  engine?: "agy" | "claude" | "auto";
  apiKey?: string;
  onTextChunk?: (chunk: string) => void;
  onToolCall?: (toolName: string, input: any) => void;
}

export interface AgentRunResult {
  text: string;
  engineUsed: "agy" | "claude";
  durationSeconds: number;
  hasArtifact: boolean;
}

export async function runAgentEngine(options: AgentRunOptions): Promise<AgentRunResult> {
  const { workDir, prompt, apiKey, onTextChunk, onToolCall } = options;

  // Auto-detect engine: prefer agy (Google subscription active) or claude if apiKey is provided
  let engine = options.engine;
  if (!engine || engine === "auto") {
    engine = apiKey ? "claude" : "agy";
  }

  const startTime = Date.now();
  let fullOutput = "";

  await fs.mkdir(workDir, { recursive: true });

  if (engine === "agy") {
    // Run agy (Antigravity CLI / Google subscription) in non-interactive print mode with stream-json
    return new Promise((resolve, reject) => {
      const child = spawn(
        "agy",
        [
          "-p",
          prompt,
          "--output-format",
          "stream-json",
          "--dangerously-skip-permissions",
        ],
        {
          cwd: workDir,
          env: {
            ...process.env,
            PATH: process.env.PATH || "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
          },
        }
      );

      let buffer = "";

      child.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            // Parse agy stream-json events
            if (event.event === "step_update" && event.step_update?.text_delta) {
              fullOutput += event.step_update.text_delta;
              onTextChunk?.(event.step_update.text_delta);
            } else if (event.event === "result" && event.result?.response) {
              if (!fullOutput) fullOutput = event.result.response;
            } else if (event.response) {
              fullOutput += event.response;
              onTextChunk?.(event.response);
            }
          } catch {
            fullOutput += line + "\n";
            onTextChunk?.(line + "\n");
          }
        }
      });

      child.stderr.on("data", (data: Buffer) => {
        console.log("[agy debug]", data.toString().trim());
      });

      child.on("close", async (code) => {
        const durationSeconds = (Date.now() - startTime) / 1000;
        // Check if an index.html or app was produced in workDir
        let hasArtifact = false;
        try {
          await fs.access(path.join(workDir, "index.html"));
          hasArtifact = true;
        } catch {
          hasArtifact = false;
        }

        resolve({
          text: fullOutput.trim() || "Task completed by Google Antigravity (agy).",
          engineUsed: "agy",
          durationSeconds,
          hasArtifact,
        });
      });

      child.on("error", (err) => reject(err));
    });
  } else {
    // Run Claude Code CLI (Anthropic subscription / BYOK)
    return new Promise((resolve, reject) => {
      const child = spawn(
        "claude",
        [
          "-p",
          prompt,
          "--output-format",
          "stream-json",
          "--dangerously-skip-permissions",
        ],
        {
          cwd: workDir,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: apiKey || process.env.ANTHROPIC_API_KEY || "",
            PATH: process.env.PATH || "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
          },
        }
      );

      let buffer = "";

      child.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "result" && event.result) {
              fullOutput += event.result;
              onTextChunk?.(event.result);
            } else if (event.delta?.text) {
              fullOutput += event.delta.text;
              onTextChunk?.(event.delta.text);
            }
          } catch {
            fullOutput += line + "\n";
            onTextChunk?.(line + "\n");
          }
        }
      });

      child.on("close", async (code) => {
        const durationSeconds = (Date.now() - startTime) / 1000;
        let hasArtifact = false;
        try {
          await fs.access(path.join(workDir, "index.html"));
          hasArtifact = true;
        } catch {
          hasArtifact = false;
        }

        resolve({
          text: fullOutput.trim() || "Task completed by Claude Code.",
          engineUsed: "claude",
          durationSeconds,
          hasArtifact,
        });
      });

      child.on("error", (err) => reject(err));
    });
  }
}
