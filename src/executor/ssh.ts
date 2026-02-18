import { execFile } from "child_process";
import type { CommandExecutor, ExecResult } from "./types.js";

export interface SshOptions {
  host: string;
  user?: string;
  port?: number;
  keyPath?: string;
}

export class SshExecutor implements CommandExecutor {
  readonly label: string;
  private sshArgs: string[];

  constructor(options: SshOptions) {
    const user = options.user || "root";
    const port = options.port || 22;
    this.label = `ssh:${user}@${options.host}:${port}`;

    this.sshArgs = [
      "-o", "BatchMode=yes",
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "ConnectTimeout=10",
      "-p", String(port),
    ];

    if (options.keyPath) {
      this.sshArgs.push("-i", options.keyPath);
    }

    this.sshArgs.push(`${user}@${options.host}`);
  }

  exec(command: string, timeoutMs = 30000): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      execFile(
        "ssh",
        [...this.sshArgs, command],
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
