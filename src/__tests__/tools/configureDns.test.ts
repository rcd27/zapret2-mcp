import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("configureDns tool", () => {
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
    const mod = await import("../../tools/configureDns.js");
    return mod.configureDnsTool;
  }

  it("configures DNS via resolv.conf", async () => {
    mock.setDefault({ stdout: "DNS configured via resolv.conf: 1.1.1.1\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({ resolver: "1.1.1.1", method: "resolv.conf" });
    expect(result.content[0].text).toContain("DNS configured");
    expect(result.content[0].text).toContain("1.1.1.1");
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain('$(id -u)');
    expect(mock.calls[0].command).toContain('$SUDO cp /etc/resolv.conf');
    expect(mock.calls[0].command).toContain('$SUDO tee /etc/resolv.conf');
  });

  it("configures DNS via systemd-resolved", async () => {
    mock.setDefault({ stdout: "DNS configured via systemd-resolved: 8.8.8.8\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({ resolver: "8.8.8.8", method: "systemd-resolved" });
    expect(result.content[0].text).toContain("systemd-resolved");
    expect(mock.calls[0].command).toContain('SUDO=""');
    expect(mock.calls[0].command).toContain('$SUDO cp "$RESOLVED_CONF"');
    expect(mock.calls[0].command).toContain('$SUDO sed -i');
    expect(mock.calls[0].command).toContain('$SUDO systemctl restart systemd-resolved');
  });

  it("rejects custom without customResolver", async () => {
    const tool = await loadTool();
    const result = await tool.handler({ resolver: "custom", method: "resolv.conf" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("customResolver is required");
  });

  it("rejects invalid IP address", async () => {
    const tool = await loadTool();
    const result = await tool.handler({ resolver: "custom", customResolver: "not-an-ip", method: "resolv.conf" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("invalid IP");
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "permission denied" }));
    const tool = await loadTool();
    const result = await tool.handler({ resolver: "1.1.1.1", method: "resolv.conf" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("permission denied");
  });
});
