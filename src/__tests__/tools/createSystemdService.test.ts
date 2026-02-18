import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("createSystemdService tool", () => {
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
    const mod = await import("../../tools/createSystemdService.js");
    return mod.createSystemdServiceTool;
  }

  it("creates and enables service by default", async () => {
    mock.setDefault({ stdout: "UNIT_CREATED\nPath: /etc/systemd/system/zapret2.service\nEnabled: true\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({ enable: true });
    expect(result.content[0].text).toContain("UNIT_CREATED");
    expect(result.content[0].text).toContain("Enabled: true");
    // Verify the script contains systemctl enable with sudo
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain('$(id -u)');
    expect(mock.calls[0].command).toContain("$SUDO systemctl enable");
    expect(mock.calls[0].command).toContain("$SUDO systemctl daemon-reload");
    expect(mock.calls[0].command).toContain("$SUDO tee /etc/systemd/system/zapret2.service");
  });

  it("creates service without enabling when enable=false", async () => {
    mock.setDefault({ stdout: "UNIT_CREATED\nPath: /etc/systemd/system/zapret2.service\nEnabled: false\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({ enable: false });
    expect(result.content[0].text).toContain("UNIT_CREATED");
    // Verify the script does NOT contain systemctl enable
    expect(mock.calls[0].command).not.toContain("systemctl enable");
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain("$SUDO systemctl daemon-reload");
  });

  it("unit file contains correct content", async () => {
    mock.setDefault({ stdout: "UNIT_CREATED\n", stderr: "" });
    const tool = await loadTool();
    await tool.handler({ enable: true });
    // The script should contain base64-encoded unit content
    const command = mock.calls[0].command;
    expect(command).toContain("base64 -d");
    // Decode base64 from command and verify
    const b64Match = command.match(/printf '%s' '([A-Za-z0-9+/=]+)' \| base64 -d/);
    expect(b64Match).toBeTruthy();
    const decoded = Buffer.from(b64Match![1], "base64").toString();
    expect(decoded).toContain("[Unit]");
    expect(decoded).toContain("zapret2 network packet processing service");
    expect(decoded).toContain("[Service]");
    expect(decoded).toContain("ExecStart=/opt/zapret2/init.d/sysv/zapret2 start");
    expect(decoded).toContain("[Install]");
  });

  it("uses 30s timeout", async () => {
    mock.setDefault({ stdout: "UNIT_CREATED\n", stderr: "" });
    const tool = await loadTool();
    await tool.handler({});
    expect(mock.calls[0].timeoutMs).toBe(30000);
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "systemctl not found" }));
    const tool = await loadTool();
    const result = await tool.handler({ enable: true });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("systemctl not found");
  });
});
