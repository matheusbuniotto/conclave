import { spawn } from "node:child_process";
import * as path from "node:path";
import type { SubagentWorkerInput, SubagentWorkerOutput } from "./subagent-worker";

export type { SubagentWorkerInput, SubagentWorkerOutput };

/**
 * Spawn an isolated OS subprocess to execute a concrete agent task so the Main Agent's
 * context window stays clean, compact, and unpolluted by raw tool outputs.
 *
 * Strictly enforces OptMem's subagent rule:
 * - Sets OPTMEM_SUBAGENT=1 and OPTMEM_ROLE=subagent in environment
 * - Passes "You are a subagent. Don't run memo."
 */
export async function delegateTaskToSubprocess(
  input: SubagentWorkerInput
): Promise<SubagentWorkerOutput> {
  const workerPath = path.resolve(__dirname, "./subagent-worker.ts");

  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["run", workerPath], {
      env: {
        ...process.env,
        OPTMEM_SUBAGENT: "1",
        OPTMEM_ROLE: "subagent",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", () => {
      try {
        const trimmed = stdout.trim();
        const jsonStart = trimmed.indexOf("{");
        const jsonStr = jsonStart >= 0 ? trimmed.slice(jsonStart) : trimmed;
        const parsed: SubagentWorkerOutput = JSON.parse(jsonStr);
        resolve(parsed);
      } catch (err) {
        reject(
          new Error(
            `Failed to parse subprocess output (stderr: ${stderr.slice(0, 200)}): ${
              (err as Error).message
            }`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
