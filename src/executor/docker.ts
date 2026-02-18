import { execFile } from "child_process";
import type { CommandExecutor, ExecResult } from "./types.js";

export class DockerExecutor implements CommandExecutor {
  readonly label: string;
  private containerName: string;

  constructor(containerName = "zapret2-openwrt") {
    this.containerName = containerName;
    this.label = `docker:${containerName}`;
  }

  exec(command: string, timeoutMs = 30000): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      execFile(
        "docker",
        ["exec", this.containerName, "bash", "-c", command],
        { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject({ error, stdout, stderr });
          } else {
            resolve({ stdout, stderr });
          }
        }
      );
    });
  }
}
