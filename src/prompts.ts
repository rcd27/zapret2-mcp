import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "setup-zapret",
    "Step-by-step guide for installing zapret2 from scratch on any supported platform",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Install and configure zapret2 from scratch. Use query-zapret-knowledge tool to get detailed instructions.

Follow these steps in order:

1. Determine the target environment: OS, init system, WAN interface.
   - Check OS: \`cat /etc/os-release\`
   - Check init: \`ps -p 1 -o comm=\` or \`systemctl --version\`
   - Check WAN: \`ip route get 1.1.1.1 | awk '{print $5; exit}'\`

2. Verify prerequisites:
   - Required tools: nft or iptables, curl, git, base64, sed, awk
   - NFQUEUE module: \`modprobe nfnetlink_queue && lsmod | grep nfnetlink_queue\`
   - Architecture: \`uname -m\`

3. Install zapret2:
   - Query knowledge for "setup installation workflow" for step-by-step commands.

4. For systemd-based desktops, additionally:
   - Configure DNS (query knowledge for "dns configuration")
   - Create systemd service (query knowledge for "systemd service")

5. Find a bypass strategy using blockcheckw:
   - Query knowledge for "blockcheckw scan strategy" for usage.

6. Apply strategy to config and start the service.

7. Verify bypass works.

If any step fails, query knowledge for "troubleshooting" to diagnose.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    "find-bypass-strategy",
    "Guide for finding a working DPI bypass strategy using blockcheckw scanner",
    { domain: z.string().optional().describe("Target domain to test (e.g. rutracker.org)") },
    (args) => {
      const domainHint = args.domain
        ? `Use domain "${args.domain}" for testing.`
        : "Ask the user which domain to test, or use a commonly blocked domain.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Find a working DPI bypass strategy for zapret2. ${domainHint}

Use query-zapret-knowledge tool to get detailed documentation on blockcheckw commands and strategy selection.

Follow these steps:

1. Check current zapret2 status. If running, stop it (blockcheckw handles this automatically).

2. Check block type first:
   \`blockcheckw status -d <domain>\`
   - If "IP blocked" → VPN needed, zapret2 can't help.
   - If "SNI blocked" → continue with strategy search.

3. (Optional) Find optimal worker count:
   \`blockcheckw benchmark -d <domain>\`

4. Scan for working strategies:
   \`blockcheckw -w 256 scan -d <domain> --top 20\`
   This takes ~2 minutes and tests 13,943 built-in strategies in parallel.

5. Verify best strategies with real data transfer:
   \`blockcheckw check --from-file scan_results.txt -d <domain> --take 10 --passes 3\`
   This filters out strategies vulnerable to 16KB DPI caps.

6. Apply the best strategy:
   - Query knowledge for "config nfqws2_opt" to understand the config format.
   - Write the strategy into NFQWS2_OPT in /opt/zapret2/config.

7. Restart the service and verify:
   \`curl -m 10 -I https://<domain>\`

Query knowledge for "strategy selection criteria" and "orchestration circular" for resilience tips.`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "troubleshoot",
    "Diagnostic workflow for when zapret2 DPI bypass is not working",
    { domain: z.string().optional().describe("Domain to test bypass against") },
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

Use query-zapret-knowledge tool with topic "troubleshooting common issues" for detailed guidance.

Gather diagnostic information:

1. Check service status:
   \`pgrep -a nfqws2\`
   \`nft list ruleset | grep -c zapret\` (or \`iptables -L -n -t mangle | grep NFQUEUE\`)

2. Check configuration:
   \`grep -E 'NFQWS2_ENABLE|NFQWS2_OPT' /opt/zapret2/config\`

3. Check NFQUEUE module:
   \`lsmod | grep nfnetlink_queue\`

4. Test connectivity:
   \`curl -m 5 -I https://<domain>\`
   \`nslookup <domain>\`

5. Check block type:
   \`blockcheckw status -d <domain>\`

Analyze results and query knowledge for specific issues found (e.g. "fooling fake packets", "ttl issues", "nfqueue module").

Common failure causes:
- IP-level blocking (not DPI) → VPN needed
- Wrong fooling → connection resets (query "fake packets fooling")
- TTL issues → use ip_autottl instead of fixed ip_ttl
- Strategy outdated → re-scan with blockcheckw
- NFQUEUE not loaded → modprobe nfnetlink_queue
- 16KB DPI cap → verify strategies with blockcheckw check`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "strategy-knowledge",
    "Complete reference guide for all DPI bypass strategy families, parameters, and recommendations",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Provide the full reference guide for zapret2 DPI bypass strategies.

Use query-zapret-knowledge with the following topics to build a comprehensive guide:

1. Query "tcp segmentation split2 disorder2" — basic splitting strategies
2. Query "fake packets fooling md5sig badsum" — fake packet injection and fooling
3. Query "http hostcase domcase" — HTTP-specific strategies
4. Query "udp quic ipfrag2" — UDP/QUIC strategies
5. Query "orchestration circular multi-profile" — strategy orchestration
6. Query "dpi types recommended approaches" — DPI classification and recommendations
7. Query "nfqws2 options parameters" — full nfqws2 CLI reference

Present the information in a structured format covering:
- Strategy families and when to use each
- Key parameters and examples
- DPI type identification and matching strategies
- Protocol-specific notes (TLS 1.2 vs 1.3, QUIC, HTTP)
- Resilience and orchestration patterns`,
          },
        },
      ],
    }),
  );
}
