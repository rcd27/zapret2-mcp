#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { KnowledgeIndex } from "./indexer.js";
import { registerPrompts } from "./prompts.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const knowledgeDir = resolve(__dirname, "..", "knowledge");

const index = new KnowledgeIndex(knowledgeDir);

const server = new McpServer(
  {
    name: "zapret2-mcp",
    version: "0.4.0",
  },
  {
    instructions: `zapret2-mcp is a knowledge server for zapret2 (DPI bypass tool by bol-van) and blockcheckw (fast strategy scanner by rcd27).

It provides contextual documentation and expert knowledge about:
- DPI bypass strategies (split2, disorder2, fake, fooling, etc.)
- zapret2 configuration and service management
- blockcheckw commands for parallel strategy discovery
- Installation workflows for Linux desktops, servers, and OpenWrt routers
- Troubleshooting common issues

Use the query-zapret-knowledge tool to search the knowledge base.
IMPORTANT: The entire knowledge base is written in Russian. Always query in Russian for accurate results (e.g. 'стратегия split2' instead of 'split2 strategy').
Use getPrompt for guided workflows: setup-zapret, find-bypass-strategy, troubleshoot, strategy-knowledge.

This server does NOT execute commands — it provides knowledge and guidance. The consuming agent executes commands directly.

FALLBACK: If query-zapret-knowledge returns no results or insufficient information, check these primary sources directly (via web fetch):
1. DeepWiki (most complete, generated from source code): https://deepwiki.com/bol-van/zapret2
2. Official docs: https://github.com/bol-van/zapret2/blob/master/docs/manual.md
3. Community docs (Obsidian Publish): https://publish.obsidian.md/zapret — raw markdown available at https://publish-01.obsidian.md/access/18b1b883e5b94cb062854c94fb182bb4/{path}.md (e.g. Zapret/Zapret2%20-%20lua-desync.md)`,
  },
);

server.tool(
  "query-zapret-knowledge",
  "Search zapret2 and blockcheckw knowledge base by topic. Returns relevant documentation, strategy guides, configuration references, and troubleshooting information. IMPORTANT: The entire knowledge base is in Russian. Always send queries in Russian for best results.",
  {
    topic: z.string().describe("What to search for — MUST be in Russian (e.g. 'стратегия split2', 'сканирование blockcheckw', 'диагностика dns', 'конфигурация nfqws2_opt')"),
    tokens: z.number().optional().describe("Maximum approximate token count for the response (default: 4000). Use 0 for unlimited."),
    context: z.string().optional().describe("What you already know or checked, in Russian (e.g. 'curl работает на роутере, QUIC отключен, flow_offloading_hw=1'). Helps narrow results by deprioritizing already-covered topics."),
  },
  async (args) => {
    const tokenLimit = args.tokens === 0 ? undefined : (args.tokens ?? 4000);
    const results = index.query(args.topic, tokenLimit, args.context);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No results found for "${args.topic}". The knowledge base is in Russian — try querying in Russian. Broader keywords to try: стратегии, конфигурация, blockcheckw, диагностика, установка, платформы.\n\nFallback: check primary sources directly via web fetch:\n1. https://deepwiki.com/bol-van/zapret2 (most complete)\n2. https://github.com/bol-van/zapret2/blob/master/docs/manual.md\n3. https://publish-01.obsidian.md/access/18b1b883e5b94cb062854c94fb182bb4/Zapret/home.md (community docs, raw markdown)`,
          },
        ],
      };
    }

    const sections = results.map((entry) => {
      const versionInfo = [
        entry.zapret2Version && `zapret2: ${entry.zapret2Version}`,
        entry.blockcheckwVersion && `blockcheckw: ${entry.blockcheckwVersion}`,
      ]
        .filter(Boolean)
        .join(", ");

      return `## ${entry.title}${versionInfo ? `\n_Version: ${versionInfo}_` : ""}\n\n${entry.content}`;
    });

    return {
      content: [
        {
          type: "text" as const,
          text: sections.join("\n\n---\n\n"),
        },
      ],
    };
  },
);

registerPrompts(server);

// MCP Resources: expose knowledge articles for browsing
server.resource(
  "knowledge-article",
  new ResourceTemplate("zapret2://knowledge/{+path}", {
    list: async () => ({
      resources: index.all().map((entry) => ({
        uri: `zapret2://knowledge/${entry.path}`,
        name: entry.title,
        description: `Tags: ${entry.tags.join(", ")}`,
        mimeType: "text/markdown" as const,
      })),
    }),
  }),
  { description: "Knowledge base article", mimeType: "text/markdown" },
  async (uri, variables) => {
    const path = variables.path as string;
    const entry = index.all().find((e) => e.path === path);
    if (!entry) {
      throw new Error(`Article not found: ${path}`);
    }
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown" as const,
          text: `# ${entry.title}\n\n${entry.content}`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`zapret2-mcp knowledge server started (${index.all().length} knowledge entries indexed)`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
