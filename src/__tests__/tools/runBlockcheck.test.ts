import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("runBlockcheck tool", () => {
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
    const mod = await import("../../tools/runBlockcheck.js");
    return mod.runBlockcheckTool;
  }

  it("filters AVAILABLE lines and includes log URI", async () => {
    const output = [
      "checking example.com...",
      "AVAILABLE strategy: nfqws2 --dpi-desync=fake",
      "some other line",
      "summary: 1 strategy found",
    ].join("\n");
    mock.setDefault({ stdout: output, stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.content[0].text).toContain("AVAILABLE strategy");
    expect(result.content[0].text).toContain("summary");
    expect(result.content[0].text).toContain("zapret2://logs/blockcheck/");
    expect(result.content[0].text).not.toContain("checking example.com");
    // Verify sudo pattern
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain('$(id -u)');
    expect(mock.calls[0].command).toContain('$SUDO /opt/zapret2/blockcheck2.sh');
    // Verify correct stdin format: domain + ipVersion (not scanLevel)
    expect(mock.calls[0].command).toContain('printf \'%s\\n\' "example.com" "4"');
    expect(mock.calls[0].command).not.toContain('"Y"');
  });

  it("uses 300s timeout", async () => {
    mock.setDefault({ stdout: "done", stderr: "" });
    const tool = await loadTool();
    await tool.handler({});
    expect(mock.calls[0].timeoutMs).toBe(300000);
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "partial output", stderr: "error" }));
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("partial output");
  });
});
