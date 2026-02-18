import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("installZapret tool", () => {
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
    const mod = await import("../../tools/installZapret.js");
    return mod.installZapretTool;
  }

  it("returns success output on fresh install", async () => {
    mock.setDefault({ stdout: "INSTALL_OK\nVersion: v0.9.4.1\nBinary: -rwxr-xr-x nfqws2", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.content[0].text).toContain("INSTALL_OK");
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain('$(id -u)');
    expect(mock.calls[0].command).toContain('$SUDO rm -rf');
    expect(mock.calls[0].command).toContain('$SUDO git clone');
    expect(mock.calls[0].command).toContain('$SUDO cp -r');
    expect(mock.calls[0].command).toContain('$SUDO sh install_bin.sh');
    expect(mock.calls[0].command).toContain('$SUDO tee /opt/zapret2/config');
  });

  it("returns already installed message when not forced", async () => {
    mock.setDefault({ stdout: "ALREADY_INSTALLED\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.content[0].text).toContain("already installed");
    expect(result.content[0].text).toContain("force=true");
  });

  it("uses 120s timeout", async () => {
    mock.setDefault({ stdout: "INSTALL_OK", stderr: "" });
    const tool = await loadTool();
    await tool.handler({});
    expect(mock.calls[0].timeoutMs).toBe(120000);
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "git clone failed", stderr: "network error" }));
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("git clone failed");
  });
});
