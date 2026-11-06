import { DockerComputeProvider } from "./docker-provider";
import type { ComputeProvider } from "./types";

export * from "./types";
export * from "./docker-provider";

let defaultProvider: ComputeProvider | null = null;

export async function getComputeProvider(): Promise<ComputeProvider> {
  if (!defaultProvider) {
    const dockerProvider = new DockerComputeProvider();
    if (await dockerProvider.isAvailable()) {
      defaultProvider = dockerProvider;
    } else {
      throw new Error("No compute provider available: Docker daemon is not accessible");
    }
  }
  return defaultProvider;
}
