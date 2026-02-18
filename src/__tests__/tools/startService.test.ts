import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("startService tool", () => {
  let mock: MockExecutor;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "zapret2-test-"));
    process.env.ZAPRET2_LOG_DIR = tempDir;
    vi.resetModules();
    mock = new MockExecutor();
  });

  afterEach(() => {
    delete process.env.ZAPRET2_LOG_DIR;
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function loadTool() {
    const { initExecutor } = await import("../../executorInstance.js");
    initExecutor(mock);
    const mod = await import("../../tools/startService.js");
    return mod.startServiceTool;
  }

  it("returns output on success", async () => {
    mock.setDefault({ stdout: "Starting zapret2...\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler();
    expect(result.content[0].text).toBe("Starting zapret2...");
    expect(mock.calls[0].command).toContain("zapret2 start");
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain('$(id -u)');
    expect(mock.calls[0].command).toContain('$SUDO');
  });

  it("uses fallback text when output is empty", async () => {
    mock.setDefault({ stdout: "", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler();
    expect(result.content[0].text).toBe("Service started");
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "already running" }));
    const tool = await loadTool();
    const result = await tool.handler();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("already running");
  });
});
