import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("removeZapret2 tool", () => {
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
    const mod = await import("../../tools/removeZapret.js");
    return mod.removeZapretTool;
  }

  it("returns success output when zapret2 is removed", async () => {
    const output = [
      "=== zapret2 removal started ===",
      "--- Stopping via init script ---",
      "init: stopped",
      "--- Removing /opt/zapret2 ---",
      "REMOVE_OK: /opt/zapret2 deleted",
      "=== Removal complete ===",
      "nfqws2 running: NO",
      "systemd unit: removed",
    ].join("\n");
    mock.setDefault({ stdout: output, stderr: "" });

    const tool = await loadTool();
    const result = await tool.handler({});

    expect(result.content[0].text).toContain("REMOVE_OK");
    expect(result.content[0].text).toContain("Removal complete");
    expect(result.isError).toBeFalsy();
  });

  it("returns not-installed message when /opt/zapret2 is absent", async () => {
    mock.setDefault({ stdout: "NOT_INSTALLED: /opt/zapret2 not found, nothing to remove.", stderr: "" });

    const tool = await loadTool();
    const result = await tool.handler({});

    expect(result.content[0].text).toContain("NOT_INSTALLED");
    expect(result.isError).toBeFalsy();
  });

  it("script contains sudo, stop, pkill, rm -rf /opt/zapret2", async () => {
    mock.setDefault({ stdout: "REMOVE_OK", stderr: "" });

    const tool = await loadTool();
    await tool.handler({});

    const cmd = mock.calls[0].command;
    expect(cmd).toContain('SUDO=""');
    expect(cmd).toContain('$(id -u)');
    expect(cmd).toContain('zapret2 stop');
    expect(cmd).toContain('pkill -x nfqws2');
    expect(cmd).toContain('rm -rf /opt/zapret2');
  });

  it("uses 60s timeout", async () => {
    mock.setDefault({ stdout: "REMOVE_OK", stderr: "" });

    const tool = await loadTool();
    await tool.handler({});

    expect(mock.calls[0].timeoutMs).toBe(60000);
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(
      Object.assign(new Error("permission denied"), { stdout: "rm: cannot remove", stderr: "permission denied" })
    );

    const tool = await loadTool();
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("permission denied");
  });
});
