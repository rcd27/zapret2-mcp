import type { CommandExecutor } from "./types.js";
import { LocalExecutor } from "./local.js";
import { DockerExecutor } from "./docker.js";
import { SshExecutor } from "./ssh.js";

export function createExecutor(): CommandExecutor {
  const mode = (process.env.ZAPRET2_MODE || "docker").toLowerCase();

  switch (mode) {
    case "local":
      return new LocalExecutor();

    case "docker":
      return new DockerExecutor(
        process.env.ZAPRET2_CONTAINER_NAME || "zapret2-openwrt"
      );

    case "ssh": {
      const host = process.env.ZAPRET2_SSH_HOST;
      if (!host) {
        throw new Error("ZAPRET2_SSH_HOST is required when ZAPRET2_MODE=ssh");
      }
      return new SshExecutor({
        host,
        user: process.env.ZAPRET2_SSH_USER || "root",
        port: process.env.ZAPRET2_SSH_PORT ? Number(process.env.ZAPRET2_SSH_PORT) : 22,
        keyPath: process.env.ZAPRET2_SSH_KEY || undefined,
      });
    }

    default:
      throw new Error(`Unknown ZAPRET2_MODE: ${mode}. Must be local, docker, or ssh`);
  }
}
