import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("updateConfig tool", () => {
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
    const mod = await import("../../tools/updateConfig.js");
    return mod.updateConfigTool;
  }

  it("updates config and returns result", async () => {
    mock.when("cat /opt/zapret2/config", { stdout: "NFQWS2_ENABLE=0\n", stderr: "" });
    mock.setDefault({ stdout: "Updated NFQWS2_ENABLE:\nNFQWS2_ENABLE=1\n", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({ key: "NFQWS2_ENABLE", value: "1" });
    expect(result.content[0].text).toContain("Updated NFQWS2_ENABLE");
  });

  it("rejects invalid key with special characters", async () => {
    const tool = await loadTool();
    const result = await tool.handler({ key: "BAD;KEY", value: "1" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("alphanumeric");
  });

  it("uses base64 encoding for value in script", async () => {
    mock.when("cat /opt/zapret2/config", { stdout: "NFQWS2_OPT=old\n", stderr: "" });
    mock.setDefault({ stdout: "Updated NFQWS2_OPT:\nNFQWS2_OPT=--dpi-desync=fake\n", stderr: "" });
    const tool = await loadTool();
    await tool.handler({ key: "NFQWS2_OPT", value: '--dpi-desync=fake|$(evil)' });
    // The script should contain base64 instead of raw value
    const updateCall = mock.calls.find(c => c.command.includes("base64 -d"));
    expect(updateCall).toBeTruthy();
    // Verify the raw value is NOT in the command
    expect(updateCall!.command).not.toContain("$(evil)");
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "permission denied" }));
    const tool = await loadTool();
    const result = await tool.handler({ key: "NFQWS2_ENABLE", value: "1" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("permission denied");
  });
});
