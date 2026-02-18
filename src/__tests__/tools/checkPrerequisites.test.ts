import { describe, it, expect, beforeEach } from "vitest";
import { MockExecutor } from "../helpers/mockExecutor.js";
import { initExecutor } from "../../executorInstance.js";
import { checkPrerequisitesTool } from "../../tools/checkPrerequisites.js";

describe("checkPrerequisites tool", () => {
  let mock: MockExecutor;

  beforeEach(() => {
    mock = new MockExecutor();
    initExecutor(mock);
  });

  it("returns JSON with prereqs on success", async () => {
    const json = JSON.stringify({
      arch: "x86_64",
      os: { id: "ubuntu", version: "22.04", pretty: "Ubuntu 22.04 LTS" },
      initSystem: "systemd",
      tools: { nft: true, curl: true, base64: true },
      zapretDirExists: true,
      nfqwsBinaryExists: true,
      networkConnectivity: true,
      nfqueueModule: true,
      wanInterface: "eth0",
      dnsResolvers: "8.8.8.8",
      inContainer: false,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await checkPrerequisitesTool.handler();
    expect(result.content[0].text).toContain("x86_64");
    expect(result.content[0].text).toContain('"nft":true');
  });

  it("includes new fields: os, initSystem, nfqueueModule, wanInterface, dnsResolvers, inContainer", async () => {
    const json = JSON.stringify({
      arch: "aarch64",
      os: { id: "openwrt", version: "", pretty: "OpenWrt SNAPSHOT" },
      initSystem: "procd",
      tools: { nft: true, curl: true, base64: true },
      zapretDirExists: false,
      nfqwsBinaryExists: false,
      networkConnectivity: true,
      nfqueueModule: false,
      wanInterface: "br-lan",
      dnsResolvers: "127.0.0.1",
      inContainer: true,
    });
    mock.setDefault({ stdout: json, stderr: "" });
    const result = await checkPrerequisitesTool.handler();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.os.id).toBe("openwrt");
    expect(parsed.initSystem).toBe("procd");
    expect(parsed.nfqueueModule).toBe(false);
    expect(parsed.wanInterface).toBe("br-lan");
    expect(parsed.dnsResolvers).toBe("127.0.0.1");
    expect(parsed.inContainer).toBe(true);
  });

  it("uses 15s timeout", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await checkPrerequisitesTool.handler();
    expect(mock.calls[0].timeoutMs).toBe(15000);
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("timeout"), { stdout: "", stderr: "timed out" }));
    const result = await checkPrerequisitesTool.handler();
    expect(result.isError).toBe(true);
  });
});
