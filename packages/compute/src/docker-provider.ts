import { exec as nodeExec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { ComputeProvider, SandboxInstance, ExecResult } from "./types";

const execAsync = promisify(nodeExec);

export class DockerComputeProvider implements ComputeProvider {
  name = "docker-local";
  private baseDir: string;
  private instances = new Map<string, SandboxInstance>();
  private nextPort = 4100;

  constructor() {
    this.baseDir = path.join(os.homedir(), ".conclave", "workspaces");
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync("docker info");
      return true;
    } catch {
      return false;
    }
  }

  private sanitizeName(workspaceId: string, botId: string): string {
    const w = workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    const b = botId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    return `conclave-sb-${w}-${b}`;
  }

  async getOrCreateSandbox(workspaceId: string, botId: string): Promise<SandboxInstance> {
    const containerName = this.sanitizeName(workspaceId, botId);
    const instanceKey = `${workspaceId}:${botId}`;

    if (this.instances.has(instanceKey)) {
      const existing = this.instances.get(instanceKey)!;
      return existing;
    }

    const hostDir = path.join(this.baseDir, workspaceId, botId);
    await fs.mkdir(hostDir, { recursive: true });

    // Check if container already exists
    try {
      const { stdout } = await execAsync(
        `docker ps -a --filter "name=${containerName}" --format "{{.Status}}"`
      );

      if (stdout.includes("Up")) {
        // Find existing port mapping
        const { stdout: portOut } = await execAsync(`docker port ${containerName} 3000`);
        const match = portOut.match(/:(\d+)$/m);
        const hostPort = match ? parseInt(match[1], 10) : undefined;

        const instance: SandboxInstance = {
          id: containerName,
          workspaceId,
          botId,
          status: "ready",
          hostPort,
          containerId: containerName,
          workDir: hostDir,
        };
        this.instances.set(instanceKey, instance);
        return instance;
      } else if (stdout.trim().length > 0) {
        // Container exists but stopped -> start it
        await execAsync(`docker start ${containerName}`);
        const { stdout: portOut } = await execAsync(`docker port ${containerName} 3000`);
        const match = portOut.match(/:(\d+)$/m);
        const hostPort = match ? parseInt(match[1], 10) : undefined;

        const instance: SandboxInstance = {
          id: containerName,
          workspaceId,
          botId,
          status: "ready",
          hostPort,
          containerId: containerName,
          workDir: hostDir,
        };
        this.instances.set(instanceKey, instance);
        return instance;
      }
    } catch {
      // Proceed to create
    }

    // Dynamically find the next available host port
    let hostPort = 4100;
    try {
      const { stdout: psOut } = await execAsync(`docker ps --format "{{.Ports}}"`);
      const allocatedPorts = new Set(
        Array.from(psOut.matchAll(/:(\d+)->/g)).map((m) => parseInt(m[1], 10))
      );
      while (allocatedPorts.has(hostPort)) {
        hostPort++;
      }
    } catch {
      hostPort = this.nextPort++;
    }

    // Clean up any stale/dead container with the same name before recreating
    try {
      await execAsync(`docker rm -f ${containerName}`);
    } catch {}

    // Create and run new container
    await execAsync(
      `docker run -d --name ${containerName} -p ${hostPort}:3000 -v "${hostDir}:/workspace" conclave-sandbox:latest`
    );

    const instance: SandboxInstance = {
      id: containerName,
      workspaceId,
      botId,
      status: "ready",
      hostPort,
      containerId: containerName,
      workDir: hostDir,
    };
    this.instances.set(instanceKey, instance);
    return instance;
  }

  async exec(instanceId: string, command: string, workDir: string = "/workspace"): Promise<ExecResult> {
    try {
      const escaped = command.replace(/'/g, "'\\''");
      const { stdout, stderr } = await execAsync(
        `docker exec -w "${workDir}" ${instanceId} sh -c '${escaped}'`
      );
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout || "",
        stderr: err.stderr || err.message,
        exitCode: err.code || 1,
      };
    }
  }

  async execDetached(instanceId: string, command: string, workDir: string = "/workspace"): Promise<void> {
    const escaped = command.replace(/'/g, "'\\''");
    await execAsync(`docker exec -d -w "${workDir}" ${instanceId} sh -c '${escaped}'`);
  }

  async writeFile(instanceId: string, relativePath: string, content: string): Promise<void> {
    const instance = Array.from(this.instances.values()).find((i) => i.id === instanceId);
    if (!instance) throw new Error(`Sandbox ${instanceId} not found`);

    const fullPath = path.join(instance.workDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");
  }

  async readFile(instanceId: string, relativePath: string): Promise<string> {
    const instance = Array.from(this.instances.values()).find((i) => i.id === instanceId);
    if (!instance) throw new Error(`Sandbox ${instanceId} not found`);

    const fullPath = path.join(instance.workDir, relativePath);
    return await fs.readFile(fullPath, "utf-8");
  }

  async stopSandbox(instanceId: string): Promise<void> {
    try {
      await execAsync(`docker stop ${instanceId}`);
    } catch {
      // Ignored
    }
  }
}
