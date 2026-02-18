import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("logStore", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "zapret2-log-test-"));
    process.env.ZAPRET2_LOG_DIR = tempDir;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.ZAPRET2_LOG_DIR;
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function loadLogStore() {
    return await import("../logStore.js");
  }

  it("saveLog returns a timestamp string", async () => {
    const { saveLog } = await loadLogStore();
    const ts = saveLog("service", "test content");
    expect(typeof ts).toBe("string");
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/);
  });

  it("saved file contains JSON metadata in first line", async () => {
    const { saveLog } = await loadLogStore();
    const ts = saveLog("service", "test content", { action: "start" });
    const filePath = join(tempDir, "service", `${ts}.log`);
    const raw = readFileSync(filePath, "utf-8");
    const firstLine = raw.split("\n")[0];
    expect(JSON.parse(firstLine)).toEqual({ action: "start" });
  });

  it("listLogs without filter returns all types", async () => {
    const { saveLog, listLogs } = await loadLogStore();
    saveLog("service", "svc");
    saveLog("blockcheck", "bc");
    saveLog("config", "cfg");
    const entries = listLogs();
    const types = [...new Set(entries.map((e) => e.type))];
    expect(types).toContain("service");
    expect(types).toContain("blockcheck");
    expect(types).toContain("config");
  });

  it("listLogs with filter returns only specified type", async () => {
    const { saveLog, listLogs } = await loadLogStore();
    saveLog("service", "svc");
    saveLog("blockcheck", "bc");
    const entries = listLogs("service");
    expect(entries.every((e) => e.type === "service")).toBe(true);
    expect(entries.length).toBe(1);
  });

  it("listLogs on empty directory returns []", async () => {
    const { listLogs } = await loadLogStore();
    expect(listLogs()).toEqual([]);
  });

  it("listLogs entry has correct URI format", async () => {
    const { saveLog, listLogs } = await loadLogStore();
    const ts = saveLog("blockcheck", "data");
    const entries = listLogs("blockcheck");
    expect(entries[0].uri).toBe(`zapret2://logs/blockcheck/${ts}`);
  });

  it("readLog returns content without header", async () => {
    const { saveLog, readLog } = await loadLogStore();
    const ts = saveLog("service", "hello world", { action: "test" });
    const content = readLog("service", ts);
    expect(content).toBe("hello world");
  });

  it("readLog returns null for non-existent file", async () => {
    const { readLog } = await loadLogStore();
    expect(readLog("service", "1999-01-01T00-00-00")).toBeNull();
  });

  it("setOnLogSaved callback is called on save", async () => {
    const { saveLog, setOnLogSaved } = await loadLogStore();
    const fn = vi.fn();
    setOnLogSaved(fn);
    saveLog("config", "data");
    expect(fn).toHaveBeenCalledOnce();
  });
});
