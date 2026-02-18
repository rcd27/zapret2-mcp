import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("stopService tool", () => {
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
    const mod = await import("../../tools/stopService.js");
    return mod.stopServiceTool;
  }

  it("returns output on success", async () => {
    mock.setDefault({ stdout: "Stopping zapret2...\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler();
    expect(result.content[0].text).toBe("Stopping zapret2...");
    expect(mock.calls[0].command).toContain("zapret2 stop");
  });

  it("uses fallback text when output is empty", async () => {
    mock.setDefault({ stdout: "", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler();
    expect(result.content[0].text).toBe("Service stopped");
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "not running" }));
    const tool = await loadTool();
    const result = await tool.handler();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not running");
  });
});
