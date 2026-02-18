import { describe, it, expect, beforeEach } from "vitest";
import { MockExecutor } from "../helpers/mockExecutor.js";
import { initExecutor } from "../../executorInstance.js";
import { getStatusTool } from "../../tools/getStatus.js";

describe("getStatus tool", () => {
  let mock: MockExecutor;

  beforeEach(() => {
    mock = new MockExecutor();
    initExecutor(mock);
  });

  it("returns status JSON on success", async () => {
    mock.setDefault({
      stdout: '{"running": true, "pid": "123", "nftRulesCount": 4, "nfqws2Enabled": "1"}',
      stderr: "",
    });
    const result = await getStatusTool.handler();
    expect(result.content[0].text).toContain('"running": true');
    expect(result.content[0].text).toContain('"pid": "123"');
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "connection refused" }));
    const result = await getStatusTool.handler();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("connection refused");
  });

  it("passes script to executor", async () => {
    mock.setDefault({ stdout: "{}", stderr: "" });
    await getStatusTool.handler();
    expect(mock.calls.length).toBe(1);
    expect(mock.calls[0].command).toContain("pgrep");
  });
});
