#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { KnowledgeIndex } from "./indexer.js";
import { registerPrompts } from "./prompts.js";

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
Use getPrompt for guided workflows: setup-zapret, find-bypass-strategy, troubleshoot, strategy-knowledge.

This server does NOT execute commands — it provides knowledge and guidance. The consuming agent executes commands directly.`,
  },
);

server.tool(
  "query-zapret-knowledge",
  "Search zapret2 and blockcheckw knowledge base by topic. Returns relevant documentation, strategy guides, configuration references, and troubleshooting information.",
  {
    topic: z.string().describe("What to search for (e.g. 'split2 strategy', 'blockcheckw scan', 'troubleshooting dns', 'config nfqws2_opt')"),
    tokens: z.number().optional().describe("Maximum approximate token count for the response (default: 4000). Use 0 for unlimited."),
    context: z.string().optional().describe("What you already know or checked (e.g. 'curl OK on router, QUIC disabled, flow_offloading_hw=1'). Helps narrow results by deprioritizing already-covered topics."),
  },
  async (args) => {
    const tokenLimit = args.tokens === 0 ? undefined : (args.tokens ?? 4000);
    const results = index.query(args.topic, tokenLimit, args.context);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No results found for "${args.topic}". Try broader keywords like: strategies, config, blockcheckw, troubleshooting, setup, platforms.`,
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`zapret2-mcp knowledge server started (${index.all().length} knowledge entries indexed)`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
