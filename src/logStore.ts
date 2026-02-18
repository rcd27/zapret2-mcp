import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export type LogType = "blockcheck" | "service" | "config";

export interface LogEntry {
  type: LogType;
  timestamp: string;
  uri: string;
  size: number;
  meta: Record<string, string>;
}

const LOG_DIR = process.env.ZAPRET2_LOG_DIR ?? join(homedir(), ".zapret2-mcp", "logs");

let onLogSaved: (() => void) | null = null;

export function setOnLogSaved(callback: () => void): void {
  onLogSaved = callback;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "");
}

export function saveLog(type: LogType, content: string, meta?: Record<string, string>): string {
  const dir = join(LOG_DIR, type);
  ensureDir(dir);

  const ts = formatTimestamp(new Date());
  const metaObj = meta || {};
  const header = JSON.stringify(metaObj);
  const fileContent = header + "\n\n" + content;

  writeFileSync(join(dir, `${ts}.log`), fileContent, "utf-8");

  if (onLogSaved) {
    onLogSaved();
  }

  return ts;
}

export function listLogs(type?: LogType): LogEntry[] {
  const types: LogType[] = type ? [type] : ["blockcheck", "service", "config"];
  const entries: LogEntry[] = [];

  for (const t of types) {
    const dir = join(LOG_DIR, t);
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".log")).sort();
      for (const file of files) {
        const filePath = join(dir, file);
        const ts = file.replace(/\.log$/, "");
        const stat = statSync(filePath);

        let meta: Record<string, string> = {};
        try {
          const raw = readFileSync(filePath, "utf-8");
          const firstLine = raw.split("\n")[0];
          meta = JSON.parse(firstLine);
        } catch {
          // ignore parse errors
        }

        entries.push({
          type: t,
          timestamp: ts,
          uri: `zapret2://logs/${t}/${ts}`,
          size: stat.size,
          meta,
        });
      }
    } catch {
      // directory doesn't exist yet
    }
  }

  return entries;
}

export function readLog(type: LogType, timestamp: string): string | null {
  const filePath = join(LOG_DIR, type, `${timestamp}.log`);
  try {
    const raw = readFileSync(filePath, "utf-8");
    const idx = raw.indexOf("\n\n");
    if (idx === -1) return raw;
    return raw.slice(idx + 2);
  } catch {
    return null;
  }
}
