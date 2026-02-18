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
      httpCode: "200",
      curlExit: "0",
      zapretRunning: true,
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

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "exec error" }));
    const result = await verifyBypassTool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("exec error");
  });
});
