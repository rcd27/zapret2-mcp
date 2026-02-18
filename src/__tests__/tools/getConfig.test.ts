import { describe, it, expect, beforeEach } from "vitest";
import { MockExecutor } from "../helpers/mockExecutor.js";
import { initExecutor } from "../../executorInstance.js";
import { getConfigTool } from "../../tools/getConfig.js";

describe("getConfig tool", () => {
  let mock: MockExecutor;

  beforeEach(() => {
    mock = new MockExecutor();
    initExecutor(mock);
  });

  it("returns full config when no key specified", async () => {
    mock.setDefault({ stdout: "NFQWS2_ENABLE=1\nNFQWS2_OPT=--fake\n", stderr: "" });
    const result = await getConfigTool.handler({});
    expect(result.content[0].text).toContain("NFQWS2_ENABLE=1");
    expect(mock.calls[0].command).toContain("cat /opt/zapret2/config");
  });

  it("returns filtered config when key specified", async () => {
    mock.setDefault({ stdout: "NFQWS2_ENABLE=1\n", stderr: "" });
    const result = await getConfigTool.handler({ key: "NFQWS2_ENABLE" });
    expect(mock.calls[0].command).toContain("grep");
    expect(mock.calls[0].command).toContain("NFQWS2_ENABLE");
  });

  it("returns error on exec failure", async () => {
    mock.setDefault(Object.assign(new Error("fail"), { stdout: "", stderr: "no such file" }));
    const result = await getConfigTool.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("no such file");
  });
});
