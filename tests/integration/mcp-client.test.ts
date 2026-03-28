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
    });

    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(transport);
  }, 10_000);

  afterAll(async () => {
    await client?.close();
  });

  it("server identifies as zapret2-mcp v0.4.0", () => {
    const info = client.getServerVersion();
    expect(info?.name).toBe("zapret2-mcp");
    expect(info?.version).toBe("0.4.0");
  });

  it("lists query-zapret-knowledge tool", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("query-zapret-knowledge");
    expect(tools.length).toBe(1);
  });

  it("lists prompts", async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.length).toBe(4);
    const names = prompts.map((p) => p.name);
    expect(names).toContain("setup-zapret");
    expect(names).toContain("find-bypass-strategy");
    expect(names).toContain("troubleshoot");
    expect(names).toContain("strategy-knowledge");
  });

  it("query-zapret-knowledge returns results for 'split2'", async () => {
    const result = await client.callTool({
      name: "query-zapret-knowledge",
      arguments: { topic: "split2" },
    });
    expect(result.content).toBeDefined();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("split2");
  });

  it("query-zapret-knowledge returns results for 'blockcheckw'", async () => {
    const result = await client.callTool({
      name: "query-zapret-knowledge",
      arguments: { topic: "blockcheckw scan" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("blockcheckw");
  });

  it("query-zapret-knowledge returns no results message for nonsense", async () => {
    const result = await client.callTool({
      name: "query-zapret-knowledge",
      arguments: { topic: "xyzzy foobar baz" },
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("No results found");
  });

  it("query-zapret-knowledge respects token limit", async () => {
    const unlimited = await client.callTool({
      name: "query-zapret-knowledge",
      arguments: { topic: "strategy" },
    });
    const limited = await client.callTool({
      name: "query-zapret-knowledge",
      arguments: { topic: "strategy", tokens: 500 },
    });
    const unlimitedText = (unlimited.content as Array<{ type: string; text: string }>)[0].text;
    const limitedText = (limited.content as Array<{ type: string; text: string }>)[0].text;
    expect(limitedText.length).toBeLessThanOrEqual(unlimitedText.length);
  });
});
