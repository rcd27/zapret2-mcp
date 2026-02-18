import type { CommandExecutor } from "./executor/types.js";

let instance: CommandExecutor | null = null;

export function initExecutor(executor: CommandExecutor): void {
  instance = executor;
}

export function getExecutor(): CommandExecutor {
  if (!instance) {
    throw new Error("CommandExecutor not initialized. Call initExecutor() first.");
  }
  return instance;
}
