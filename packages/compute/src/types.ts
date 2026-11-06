export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxInstance {
  id: string;
  workspaceId: string;
  botId: string;
  status: "starting" | "ready" | "stopped" | "failed";
  hostPort?: number;
  containerId?: string;
  workDir: string;
}

export interface ComputeProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  getOrCreateSandbox(workspaceId: string, botId: string): Promise<SandboxInstance>;
  exec(instanceId: string, command: string, workDir?: string): Promise<ExecResult>;
  execDetached(instanceId: string, command: string, workDir?: string): Promise<void>;
  writeFile(instanceId: string, relativePath: string, content: string): Promise<void>;
  readFile(instanceId: string, relativePath: string): Promise<string>;
  stopSandbox(instanceId: string): Promise<void>;
}
