import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "setup-zapret",
    "Full installation pipeline: checkPrerequisites → installZapret → getConfig → updateConfig NFQWS2_ENABLE=1 → startService → verifyBypass",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Install and configure zapret2 from scratch. Follow these steps in order:

1. Run detectSystem to determine the target environment (OS, init system, WAN interface).
2. Run checkPrerequisites to verify the environment is ready (required tools, architecture, network).
3. Run installZapret to clone the repo, download binaries, and create base config.
4. Run getConfig to review the initial configuration.
5. Run updateConfig with key="NFQWS2_ENABLE" value="1" to enable nfqws2.
6. Run startService to start the zapret2 daemon.
7. Run verifyBypass to confirm DPI bypass is working.

If detectSystem shows systemd init, consider using the setup-desktop prompt instead for full desktop integration.
If any step fails, report the error and suggest remediation before proceeding.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    "find-bypass-strategy",
    "Find working DPI bypass strategy: stopService → runBlockcheck → analyze log resource → updateConfig NFQWS2_OPT → restartService → verifyBypass",
    { domain: z.string().optional().describe("Target domain to test (e.g. example.com)") },
    (args) => {
      const domainHint = args.domain
        ? `Use domain "${args.domain}" for blockcheck and verification.`
        : "Ask the user which domain to test, or use a commonly blocked domain.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Find a working DPI bypass strategy for zapret2. ${domainHint}

Follow these steps:

1. Run getStatus to check current state. If zapret2 is running, run stopService (blockcheck requires zapret2 to be stopped).
2. Run runBlockcheck with the target domain. This is a heavy operation (~5 min). The full log is saved as a resource.
3. Read the blockcheck log resource to analyze AVAILABLE strategies. Look for lines with "AVAILABLE" status — these are working bypass methods.
4. Choose the best strategy and run updateConfig with key="NFQWS2_OPT" and the selected nfqws2 parameters as value.
5. Run restartService to apply the new configuration.
6. Run verifyBypass with the target domain to confirm the bypass works.

Report the chosen strategy and verification results to the user.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "troubleshoot",
    "Diagnose zapret2 issues: getStatus → getConfig → checkPrerequisites → verifyBypass → analyze results",
    { domain: z.string().optional().describe("Domain to test bypass against (e.g. example.com)") },
    (args) => {
      const domainHint = args.domain
        ? `Test bypass against domain "${args.domain}".`
        : "Ask the user which domain is problematic, or test against a commonly blocked domain.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Diagnose why zapret2 DPI bypass is not working. ${domainHint}

Gather diagnostic information in this order:

1. Run detectSystem — determine OS, init system, WAN interface, DNS resolvers, NFQUEUE module status.
2. Run getStatus — check if zapret2 is running, if nfqws2 PID exists, if nftables rules are loaded.
3. Run getConfig — review NFQWS2_ENABLE (should be 1), NFQWS2_OPT (bypass parameters), MODE, FWTYPE.
4. Run checkPrerequisites — verify required tools are present, architecture is supported, network is reachable.
5. Run verifyBypass — test DNS resolution, HTTP connectivity, and nfqws2 status for the target domain.

Analyze the results and report:
- Is the service running?
- Are nftables rules loaded?
- Is NFQWS2_OPT configured with bypass parameters?
- Can the domain be resolved and reached?
- Is DNS configured correctly? Consider using configureDns if DNS is unreliable.
- What is the likely root cause and recommended fix?`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "setup-desktop",
    "Full installation pipeline for Linux desktop with systemd: detectSystem → checkPrerequisites → installZapret → configureDns → createSystemdService → updateConfig → startService → verifyBypass",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Install and configure zapret2 on a Linux desktop with systemd. Follow these steps in order:

1. Run detectSystem to determine OS, init system, WAN interface, and DNS configuration.
2. Verify that initSystem is "systemd". If not, suggest using the setup-zapret prompt instead.
3. Run checkPrerequisites to verify the environment is ready.
4. Run installZapret to clone the repo, download binaries, and create base config.
5. Run configureDns with an appropriate resolver (1.1.1.1 or 8.8.8.8) using the method matching the system (systemd-resolved if active, resolv.conf otherwise).
6. Run createSystemdService with enable=true to create and enable the systemd unit.
7. Run updateConfig with key="NFQWS2_ENABLE" value="1" to enable nfqws2.
8. Run startService to start the zapret2 daemon.
9. Run verifyBypass to confirm DPI bypass is working.

If any step fails, report the error and suggest remediation before proceeding.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    "overview",
    "Quick reference: all available tools, resources, and typical workflows for zapret2-mcp",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Give me an overview of zapret2-mcp capabilities.

## Available Tools (13)

**System Detection:**
- detectSystem — Detect OS, architecture, init system, WAN interface, DNS, NFQUEUE module, container status

**Status & Service:**
- getStatus — Check if zapret2 is running, PID, nftables rules, enabled flag
- startService — Start zapret2 daemon (logs saved to resources)
- stopService — Stop zapret2 daemon (logs saved to resources)
- restartService — Restart zapret2 daemon (logs saved to resources)

**Configuration:**
- getConfig — Read /opt/zapret2/config (all or by key). Key params: NFQWS2_ENABLE, NFQWS2_OPT, MODE, FWTYPE
- updateConfig — Update a config parameter (config snapshot saved to resources before change)
- configureDns — Configure DNS resolver (resolv.conf or systemd-resolved)

**Installation & Diagnostics:**
- checkPrerequisites — Verify environment: tools, architecture, network, OS, init system, NFQUEUE
- installZapret — Full install from scratch: clone, binaries, base config (auto-detects WAN interface)
- runBlockcheck — Find DPI bypass strategies (~5 min, full log saved to resources)
- verifyBypass — Test if DPI bypass works for a domain

**Desktop Integration:**
- createSystemdService — Create systemd unit for zapret2 autostart on Linux desktops

## Resources

Logs are saved to \`zapret2://logs/{type}/{timestamp}\` where type is blockcheck, service, or config.
Use listResources to browse saved logs and read them for historical comparison.

## Common Workflows

1. **Fresh install (router):** detectSystem → checkPrerequisites → installZapret → updateConfig(NFQWS2_ENABLE=1) → startService → verifyBypass
2. **Fresh install (desktop):** detectSystem → checkPrerequisites → installZapret → configureDns → createSystemdService → updateConfig(NFQWS2_ENABLE=1) → startService → verifyBypass
3. **Find strategy:** stopService → runBlockcheck → read log resource → updateConfig(NFQWS2_OPT) → restartService → verifyBypass
4. **Troubleshoot:** detectSystem → getStatus → getConfig → checkPrerequisites → verifyBypass → analyze`,
          },
        },
      ],
    }),
  );
}
