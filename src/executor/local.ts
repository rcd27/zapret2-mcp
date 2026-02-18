import { execFile } from "child_process";
import type { CommandExecutor, ExecResult } from "./types.js";

export class LocalExecutor implements CommandExecutor {
  readonly label = "local";

  exec(command: string, timeoutMs = 30000): Promise<ExecResult> {
    return new Promise((resolve, reject) => {
      execFile(
        "bash",
        ["-c", command],
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
