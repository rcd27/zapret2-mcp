import { describe, it, expect, beforeEach } from "vitest";
import { MockExecutor } from "../helpers/mockExecutor.js";
import { initExecutor } from "../../executorInstance.js";
import { detectSystemTool } from "../../tools/detectSystem.js";

describe("detectSystem tool", () => {
  let mock: MockExecutor;

  beforeEach(() => {
    mock = new MockExecutor();
    initExecutor(mock);
  });

  it("returns JSON with system info on success", async () => {
    const json = JSON.stringify({
      os: { id: "ubuntu", version: "22.04", pretty: "Ubuntu 22.04 LTS" },
      arch: "x86_64",
      initSystem: "systemd",
      wanInterface: "eth0",
      dnsResolvers: "8.8.8.8,8.8.4.4",
      nfqueueModule: true,
      inContainer: false,
      systemdResolved: true,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await detectSystemTool.handler();
    expect(result.content[0].text).toContain("ubuntu");
    expect(result.content[0].text).toContain("systemd");
    expect(result.content[0].text).toContain("eth0");
  });

  it("uses 10s timeout", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await detectSystemTool.handler();
    expect(mock.calls[0].timeoutMs).toBe(10000);
  });

  it("detects container environment", async () => {
    const json = JSON.stringify({
      os: { id: "openwrt", version: "", pretty: "" },
      arch: "x86_64",
      initSystem: "sysv",
      wanInterface: "",
      dnsResolvers: "",
      nfqueueModule: false,
      inContainer: true,
      systemdResolved: false,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await detectSystemTool.handler();
    expect(result.content[0].text).toContain('"inContainer":true');
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("timeout"), { stdout: "", stderr: "timed out" }));
    const result = await detectSystemTool.handler();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("timed out");
  });
});
