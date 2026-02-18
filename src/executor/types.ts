export interface ExecResult {
  stdout: string;
  stderr: string;
}

export interface CommandExecutor {
  exec(command: string, timeoutMs?: number): Promise<ExecResult>;
  readonly label: string;
}
