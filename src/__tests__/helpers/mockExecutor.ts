import type { CommandExecutor, ExecResult } from "../../executor/types.js";

interface CallRecord {
  command: string;
  timeoutMs?: number;
}

interface MockRule {
  pattern: string;
  response: ExecResult | Error;
}

export class MockExecutor implements CommandExecutor {
  readonly label = "mock";
  calls: CallRecord[] = [];
  private rules: MockRule[] = [];
  private defaultResponse: ExecResult | Error = { stdout: "", stderr: "" };

  setDefault(response: ExecResult | Error): void {
    this.defaultResponse = response;
  }

  when(pattern: string, response: ExecResult | Error): void {
    this.rules.push({ pattern, response });
  }

  async exec(command: string, timeoutMs?: number): Promise<ExecResult> {
    this.calls.push({ command, timeoutMs });

    for (const rule of this.rules) {
      if (command.includes(rule.pattern)) {
        if (rule.response instanceof Error) throw rule.response;
        return rule.response;
      }
    }

    if (this.defaultResponse instanceof Error) throw this.defaultResponse;
    return this.defaultResponse;
  }

  reset(): void {
    this.calls = [];
    this.rules = [];
    this.defaultResponse = { stdout: "", stderr: "" };
  }
}
