import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MockExecutor } from "../helpers/mockExecutor.js";

describe("runDpiDetector tool", () => {
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
    const mod = await import("../../tools/runDpiDetector.js");
    return mod.runDpiDetectorTool;
  }

  it("runs docker with correct flags and stdin pipe", async () => {
    mock.setDefault({ stdout: "TLS DPI detected\nTCP throttling detected", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(mock.calls[0].command).toContain("docker run --rm -i --network host");
    expect(mock.calls[0].command).toContain("ghcr.io/runnin4ik/dpi-detector:latest");
    expect(mock.calls[0].command).toContain("printf '%s\\ny\\n' '123'");
    expect(result.content[0].text).toContain("TLS DPI detected");
  });

  it("includes log URI in response", async () => {
    mock.setDefault({ stdout: "some output", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.content[0].text).toContain("zapret2://logs/dpi-detector/");
  });

  it("uses default tests=123 and timeout=180", async () => {
    mock.setDefault({ stdout: "output", stderr: "" });
    const tool = await loadTool();
    await tool.handler({});
    expect(mock.calls[0].command).toContain("'123'");
    expect(mock.calls[0].command).toContain("timeout 180");
    expect(mock.calls[0].timeoutMs).toBe(190000);
  });

  it("returns error for invalid tests parameter", async () => {
    const tool = await loadTool();
    const result = await tool.handler({ tests: "abc" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid tests parameter");
  });

  it("returns error with Docker hint on empty output", async () => {
    mock.setDefault({ stdout: "", stderr: "" });
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Docker");
  });

  it("saves and returns partial output on error", async () => {
    const partialOutput = "A".repeat(200);
    mock.setDefault(Object.assign(new Error("fail"), { stdout: partialOutput, stderr: "" }));
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.content[0].text).toContain(partialOutput);
    expect(result.content[0].text).toContain("zapret2://logs/dpi-detector/");
  });

  it("uses LocalExecutor when executor label starts with docker:", async () => {
    // Mock LocalExecutor so it doesn't run real commands
    const localExecMock = vi.fn().mockResolvedValue({ stdout: "local output", stderr: "" });
    vi.doMock("../../executor/local.js", () => ({
      LocalExecutor: class {
        readonly label = "local";
        exec = localExecMock;
      },
    }));

    const dockerMock = new MockExecutor();
    Object.defineProperty(dockerMock, "label", { value: "docker:zapret2-openwrt" });
    const { initExecutor } = await import("../../executorInstance.js");
    initExecutor(dockerMock);
    const mod = await import("../../tools/runDpiDetector.js");
    const tool = mod.runDpiDetectorTool;

    const result = await tool.handler({ tests: "1" });
    // Should NOT use the docker executor
    expect(dockerMock.calls.length).toBe(0);
    // Should use LocalExecutor
    expect(localExecMock).toHaveBeenCalled();
    expect(result.content[0].text).toContain("local output");
  });

  it("returns error on exec failure with no output", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "" }));
    const tool = await loadTool();
    const result = await tool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Error running dpi-detector");
  });
});
