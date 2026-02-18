import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

describe("MCP Server integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: ["build/index.js"],
      env: {
        ...process.env,
        ZAPRET2_MODE: "docker",
        ZAPRET2_CONTAINER_NAME: "zapret2-openwrt",
      },
    });

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client?.close();
  });

  it("lists all 13 tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("getStatus");
    expect(names).toContain("startService");
    expect(names).toContain("stopService");
    expect(names).toContain("restartService");
    expect(names).toContain("getConfig");
    expect(names).toContain("updateConfig");
    expect(names).toContain("runBlockcheck");
    expect(names).toContain("checkPrerequisites");
    expect(names).toContain("installZapret");
    expect(names).toContain("verifyBypass");
    expect(names).toContain("detectSystem");
    expect(names).toContain("configureDns");
    expect(names).toContain("createSystemdService");
    expect(tools.length).toBe(13);
  });

  it("getStatus returns JSON with expected fields", async () => {
    const result = await client.callTool({ name: "getStatus", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("running");
    expect(parsed).toHaveProperty("pid");
    expect(parsed).toHaveProperty("nftRulesCount");
  });

  it("getConfig returns text with config content", async () => {
    const result = await client.callTool({ name: "getConfig", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("NFQWS2_ENABLE");
  });

  it("detectSystem returns JSON with expected fields", async () => {
    const result = await client.callTool({ name: "detectSystem", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed).toHaveProperty("os");
    expect(parsed).toHaveProperty("arch");
    expect(parsed).toHaveProperty("initSystem");
    expect(parsed).toHaveProperty("wanInterface");
    expect(parsed).toHaveProperty("nfqueueModule");
    expect(parsed).toHaveProperty("inContainer");
  });

  it("listResources returns an array", async () => {
    const { resources } = await client.listResources();
    expect(Array.isArray(resources)).toBe(true);
  });

  it("listPrompts returns 5 prompts", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toContain("setup-zapret");
    expect(names).toContain("find-bypass-strategy");
    expect(names).toContain("troubleshoot");
    expect(names).toContain("setup-desktop");
    expect(names).toContain("overview");
    expect(prompts.length).toBe(5);
  });

  it("getPrompt overview returns messages", async () => {
    const result = await client.getPrompt({ name: "overview" });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    const content = result.messages[0].content as { type: string; text: string };
    expect(content.type).toBe("text");
    expect(content.text.length).toBeGreaterThan(0);
  });
});
