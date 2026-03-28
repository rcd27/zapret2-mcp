import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerPrompts } from "../prompts.js";

describe("prompts", () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    registerPrompts(server);

    client = new Client({ name: "test-client", version: "0.0.1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterAll(async () => {
    await client?.close();
  });

  it("lists all 4 prompts", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toContain("setup-zapret");
    expect(names).toContain("find-bypass-strategy");
    expect(names).toContain("troubleshoot");
    expect(names).toContain("strategy-knowledge");
    expect(prompts.length).toBe(4);
  });

  it("setup-zapret returns messages with non-empty text", async () => {
    const result = await client.getPrompt({ name: "setup-zapret" });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    const content = result.messages[0].content;
    expect(content).toMatchObject({ type: "text" });
    expect((content as { type: "text"; text: string }).text.length).toBeGreaterThan(0);
  });

  it("setup-zapret mentions query-zapret-knowledge", async () => {
    const result = await client.getPrompt({ name: "setup-zapret" });
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("query-zapret-knowledge");
  });

  it("find-bypass-strategy accepts domain argument", async () => {
    const result = await client.getPrompt({
      name: "find-bypass-strategy",
      arguments: { domain: "example.com" },
    });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("example.com");
  });

  it("find-bypass-strategy works without domain argument", async () => {
    const result = await client.getPrompt({ name: "find-bypass-strategy", arguments: {} });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("Ask the user");
  });

  it("find-bypass-strategy mentions blockcheckw", async () => {
    const result = await client.getPrompt({ name: "find-bypass-strategy", arguments: {} });
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("blockcheckw");
  });

  it("troubleshoot accepts domain argument", async () => {
    const result = await client.getPrompt({
      name: "troubleshoot",
      arguments: { domain: "example.com" },
    });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("example.com");
  });

  it("troubleshoot works without domain argument", async () => {
    const result = await client.getPrompt({ name: "troubleshoot", arguments: {} });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("Ask the user");
  });

  it("strategy-knowledge returns comprehensive guide prompt", async () => {
    const result = await client.getPrompt({ name: "strategy-knowledge" });
    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: "text"; text: string }).text;
    expect(text).toContain("query-zapret-knowledge");
    expect(text).toContain("split2");
  });

  it("each prompt has a description", async () => {
    const { prompts } = await client.listPrompts();
    for (const prompt of prompts) {
      expect(prompt.description).toBeTruthy();
    }
  });
});
