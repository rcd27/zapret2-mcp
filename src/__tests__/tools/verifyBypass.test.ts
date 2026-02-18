import { describe, it, expect, beforeEach } from "vitest";
import { MockExecutor } from "../helpers/mockExecutor.js";
import { initExecutor } from "../../executorInstance.js";
import { verifyBypassTool } from "../../tools/verifyBypass.js";

describe("verifyBypass tool", () => {
  let mock: MockExecutor;

  beforeEach(() => {
    mock = new MockExecutor();
    initExecutor(mock);
  });

  it("returns verify JSON on success", async () => {
    const json = JSON.stringify({
      domain: "example.com",
      dnsResolved: true,
      dnsIp: "172.67.182.196",
      wanInterface: "eth0",
      routeTo: "172.67.182.196 dev eth0 src 192.168.1.5",
      httpCode: "200",
      curlExit: "0",
      zapretRunning: true,
      firewallRulesCount: 6,
      bypassConfirmed: true,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await verifyBypassTool.handler({});
    expect(result.content[0].text).toContain("example.com");
    expect(result.content[0].text).toContain('"dnsResolved":true');
  });

  it("uses custom domain and timeout", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await verifyBypassTool.handler({ domain: "example.com", timeout: 20 });
    expect(mock.calls[0].command).toContain("example.com");
    expect(mock.calls[0].timeoutMs).toBe(25000); // (20 + 5) * 1000
  });

  it("uses interface arg when provided", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await verifyBypassTool.handler({ domain: "example.com", interface: "wlp0s20f3" });
    expect(mock.calls[0].command).toContain("wlp0s20f3");
    expect(mock.calls[0].command).toContain("--interface");
  });

  it("uses --noproxy in curl command", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await verifyBypassTool.handler({ domain: "example.com" });
    expect(mock.calls[0].command).toContain("--noproxy");
  });

  it("bypassConfirmed true when httpCode is non-zero", async () => {
    const json = JSON.stringify({
      domain: "rutracker.org",
      dnsResolved: true,
      dnsIp: "104.21.32.39",
      wanInterface: "wlp0s20f3",
      routeTo: "104.21.32.39 dev wlp0s20f3 src 192.168.1.5",
      httpCode: "200",
      curlExit: "0",
      zapretRunning: false,
      firewallRulesCount: 0,
      bypassConfirmed: true,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await verifyBypassTool.handler({ domain: "rutracker.org" });
    expect(result.content[0].text).toContain('"bypassConfirmed":true');
  });

  it("bypassConfirmed false when httpCode is 000", async () => {
    const json = JSON.stringify({
      domain: "rutracker.org",
      dnsResolved: false,
      dnsIp: "",
      wanInterface: "wlp0s20f3",
      routeTo: "",
      httpCode: "000",
      curlExit: "28",
      zapretRunning: true,
      firewallRulesCount: 6,
      bypassConfirmed: false,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await verifyBypassTool.handler({ domain: "rutracker.org" });
    expect(result.content[0].text).toContain('"bypassConfirmed":false');
  });

  it("reads IFACE_WAN from config when interface not provided", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await verifyBypassTool.handler({ domain: "example.com" });
    expect(mock.calls[0].command).toContain("IFACE_WAN");
    expect(mock.calls[0].command).toContain("/opt/zapret2/config");
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "exec error" }));
    const result = await verifyBypassTool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("exec error");
  });
});
