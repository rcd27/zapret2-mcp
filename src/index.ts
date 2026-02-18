#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createExecutor } from "./executor/index.js";
import { initExecutor } from "./executorInstance.js";

import { getStatusTool } from "./tools/getStatus.js";
import { startServiceTool } from "./tools/startService.js";
import { stopServiceTool } from "./tools/stopService.js";
import { restartServiceTool } from "./tools/restartService.js";
import { getConfigTool } from "./tools/getConfig.js";
import { updateConfigTool } from "./tools/updateConfig.js";
import { runBlockcheckTool } from "./tools/runBlockcheck.js";
import { checkPrerequisitesTool } from "./tools/checkPrerequisites.js";
import { installZapretTool } from "./tools/installZapret.js";
import { verifyBypassTool } from "./tools/verifyBypass.js";
import { detectSystemTool } from "./tools/detectSystem.js";
import { configureDnsTool } from "./tools/configureDns.js";
import { createSystemdServiceTool } from "./tools/createSystemdService.js";
import { removeZapretTool } from "./tools/removeZapret.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";
import { setOnLogSaved } from "./logStore.js";

const executor = createExecutor();
initExecutor(executor);

const server = new McpServer(
  {
    name: "zapret2-mcp",
    version: "0.2.0",
  },
  {
    instructions: `zapret2-mcp provides tools to install, configure, and diagnose zapret2 — a network packet processing tool for OpenWrt routers and Linux desktops.

Key workflows:
1. Fresh install (router): checkPrerequisites → installZapret → updateConfig(NFQWS2_ENABLE=1) → startService → verifyBypass
2. Fresh install (desktop): detectSystem → checkPrerequisites → installZapret → configureDns → createSystemdService → updateConfig(NFQWS2_ENABLE=1) → startService → verifyBypass
3. Find bypass strategy: stopService → runBlockcheck(domain) → read log resource → updateConfig(NFQWS2_OPT=...) → restartService → verifyBypass(domain)
4. Troubleshoot: detectSystem → getStatus → getConfig → checkPrerequisites → verifyBypass(domain) → analyze

Always start with detectSystem to determine the target environment (OS, init system, WAN interface).
Use configureDns to set up a reliable DNS resolver.
Use createSystemdService on systemd-based Linux desktops for service autostart.

Service management (start/stop/restart) saves logs to resources. updateConfig saves a config snapshot before changes.
runBlockcheck is a heavy operation (~5 min) that saves full output to resources for later analysis.
Use listResources to browse historical logs at zapret2://logs/{type}/{timestamp}.
Use getPrompt for step-by-step guidance: setup-zapret, setup-desktop, find-bypass-strategy, troubleshoot, overview.`,
  },
);

const tools = [
  getStatusTool,
  startServiceTool,
  stopServiceTool,
  restartServiceTool,
  getConfigTool,
  updateConfigTool,
  runBlockcheckTool,
  checkPrerequisitesTool,
  installZapretTool,
  verifyBypassTool,
  detectSystemTool,
  configureDnsTool,
  createSystemdServiceTool,
  removeZapretTool,
];

for (const tool of tools) {
  server.tool(tool.name, tool.description, tool.schema.shape, tool.handler);
}

registerResources(server);
registerPrompts(server);
setOnLogSaved(() => server.sendResourceListChanged());

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`zapret2-mcp server started (executor: ${executor.label})`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
