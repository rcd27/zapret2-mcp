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
3. Read the blockcheck log resource to analyze AVAILABLE strategies.
4. Choose the best strategy using the knowledge below, and run updateConfig with key="NFQWS2_OPT" and the selected nfqws2 parameters as value.
5. Run restartService to apply the new configuration.
6. Run verifyBypass with the target domain to confirm the bypass works.

Report the chosen strategy and verification results to the user.

## How to read blockcheck results

Blockcheck tests multiple bypass strategies against the target domain. In the output:
- **AVAILABLE** — strategy works, the site is reachable with these parameters.
- **UNAVAILABLE** — strategy failed.
- Each AVAILABLE line shows the exact nfqws2 parameters that worked.

When multiple strategies are AVAILABLE, choose based on these criteria (in priority order):
1. **Stability** — prefer strategies without fragile TTL tricks (avoid fixed ip_ttl, prefer ip_autottl or non-TTL fooling).
2. **Simplicity** — fewer parameters = more robust. Prefer \`--dpi-desync=split2\` over complex multi-strategy chains.
3. **Protocol coverage** — if the domain uses both HTTPS and HTTP, ensure the strategy covers both.
4. **TLS version awareness** — TLS 1.3 is easier to bypass (less metadata exposed). TLS 1.2 may need additional work with server response.

## Constructing NFQWS2_OPT from blockcheck results

Take the parameters from the AVAILABLE line and use them as NFQWS2_OPT value. For example:
- Blockcheck shows: \`nfqws2 --dpi-desync=fake,split2 --dpi-desync-split-pos=1 --dpi-desync-fooling=md5sig\`
- Set NFQWS2_OPT to: \`--dpi-desync=fake,split2 --dpi-desync-split-pos=1 --dpi-desync-fooling=md5sig\`

If multiple AVAILABLE strategies exist, prefer those using:
- \`split2\` or \`disorder2\` (TCP segmentation without fakes — simplest)
- \`fake,split2\` with \`md5sig\` or \`badsum\` fooling (reliable fake disposal)
- \`multisplit\` or \`multidisorder\` for complex DPI that reassembles segments
- Avoid strategies relying solely on \`ip_ttl\` — TTL varies across networks and may break on path changes.

For resilience, consider using circular orchestration:
\`--dpi-desync=fake,split2 --dpi-desync-fooling=md5sig --dpi-desync-circular-strategy=3\`
This rotates through N strategies automatically if the current one stops working.`,
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
- What is the likely root cause and recommended fix?

## Common failure causes

**IP-level blocking (not DPI):**
- If the domain's IP is blocked entirely, zapret2 cannot help — it only works against DPI inspection.
- Symptom: DNS resolves, but connection times out regardless of strategy. Try accessing via VPN to confirm.

**Wrong fooling for fakes:**
- If using fake-based strategies (fake, fakedsplit, fakeddisorder), the fake packet must be discarded by the server but accepted by the DPI.
- If fakes reach the server, it breaks the connection. Symptoms: connection reset, TLS handshake failure.
- Fix: switch fooling method. Try md5sig → badsum → ip_autottl. Use ip_autottl instead of fixed ip_ttl.

**TTL issues:**
- Fixed ip_ttl too low → fakes don't reach DPI, bypass fails.
- Fixed ip_ttl too high → fakes reach the server, connection breaks.
- Fix: use \`--dpi-desync-fooling=ip_autottl\` which auto-detects the right TTL hop count.

**Strategy stopped working:**
- DPI systems get updated. A strategy that worked yesterday may fail today.
- Fix: re-run blockcheck (find-bypass-strategy prompt) to discover new working strategies.
- For resilience, use \`--dpi-desync-circular-strategy=N\` to auto-rotate between strategies.

**NFQUEUE module not loaded:**
- If detectSystem shows nfqueueAvailable=false, nfqws2 cannot intercept packets.
- Fix: \`modprobe nfnetlink_queue\` or install the kernel module package.`,
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
    "strategy-knowledge",
    "Reference guide: all DPI bypass strategy families, nfqws2 parameters, fooling options, and protocol-specific recommendations",
    () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Provide the full reference guide for zapret2 DPI bypass strategies.

## Strategy Families

### TCP Segmentation (splitting outgoing packets)
- **split2** / **disorder2** — split TCP segment at a position. disorder2 sends segments out of order. Simplest strategies, no fakes involved.
- **multisplit** / **multidisorder** — split at multiple positions. For DPI that reassembles single-split segments.
- **fakedsplit** / **fakeddisorder** — split with a fake segment inserted between real parts. Fake confuses DPI reassembly.
- **hostfakesplit** — split only at the Host header position in HTTP.

Key parameters for segmentation:
- \`--dpi-desync-split-pos=N\` — byte offset to split at. Special values: \`host\` (start of Host/SNI), \`endhost\` (end of Host/SNI), \`midsld\` (middle of SLD in SNI).
- \`--dpi-desync-split-seqovl=N\` — TCP sequence number overlap. Confuses DPI that tracks sequences. Requires \`--dpi-desync-split-pos\` > N.
- \`--dpi-desync-split-http-req=method+host\` — split HTTP request at method and host boundaries.

### Fake Packets (injecting decoy packets that DPI processes but server ignores)
- **fake** — send a fake packet before the real one. DPI processes the fake and misses the real data.
- **rst** / **rstack** — send fake RST to make DPI think connection closed.
- **syndata** — send data in SYN packet (unusual, confuses some DPI).

Key parameters for fakes:
- \`--dpi-desync-fake-tls=<file>\` — custom fake TLS ClientHello payload.
- \`--dpi-desync-fake-http=<file>\` — custom fake HTTP request payload.

### Fooling Options (making fakes invisible to the server)
Fakes MUST be discarded by the server but processed by the DPI. Fooling options ensure this:
- \`--dpi-desync-fooling=md5sig\` — add fake TCP MD5 signature option. Server drops packets with wrong MD5. Most reliable on Linux servers.
- \`--dpi-desync-fooling=badsum\` — corrupt TCP checksum. Server's NIC drops bad checksum. Does NOT work if server has checksum offload disabled.
- \`--dpi-desync-fooling=ip_autottl\` — auto-detect TTL so fake expires before reaching server but passes DPI. Best TTL-based option.
- \`--dpi-desync-fooling=ip_ttl=N\` — fixed TTL for fakes. Fragile — depends on hop count to DPI vs server.
- \`--dpi-desync-fooling=tcp_ts\` — shift TCP timestamp far in the past. Server drops stale timestamps.
- Multiple fooling methods can be combined: \`--dpi-desync-fooling=md5sig,badsum\`

### HTTP-Specific Strategies
- \`--hostcase\` — change Host header case (e.g., "Host:" → "hOsT:"). Simple, effective against basic DPI.
- \`--domcase\` — randomize domain case in Host header. DPI can't match domain name.
- \`--methodeol\` — add extra line ending after HTTP method.

### TCP Window Manipulation
- \`--wsize=N\` — set TCP window size to force small segments from the server.
- \`--wssize=N\` — set TCP window scale factor.

### UDP/QUIC Strategies
- \`--dpi-desync-udplen-increment=N\` — pad UDP packets. Changes packet signature.
- \`--dpi-desync-fake-quic=<file>\` — custom fake QUIC Initial payload.
- IP fragmentation (\`ipfrag2\`) — fragment IP packets so DPI can't reassemble.

### Orchestration (circular)
- \`--dpi-desync-circular-strategy=N\` — rotate through N different strategies automatically.
- When current strategy fails, nfqws2 switches to the next one.
- Provides resilience against DPI updates without manual intervention.

## DPI Types and Recommended Approaches

**Domain-based DPI (inspects SNI/Host):**
→ TCP segmentation at SNI position: \`--dpi-desync=split2 --dpi-desync-split-pos=host\`
→ Or with sequence overlap: \`--dpi-desync=split2 --dpi-desync-split-pos=host --dpi-desync-split-seqovl=1\`

**Stateful DPI (tracks TCP state):**
→ Fakes + fooling: \`--dpi-desync=fake,split2 --dpi-desync-fooling=md5sig\`
→ RST injection: \`--dpi-desync=rst --dpi-desync-fooling=ip_autottl\`

**Stateless DPI (inspects individual packets):**
→ IP fragmentation: \`--dpi-desync=ipfrag2\`
→ Padding/disorder: \`--dpi-desync=disorder2\`

**HTTP-only DPI:**
→ \`--hostcase --dpi-desync=split2 --dpi-desync-split-http-req=method+host\`

## Protocol-Specific Notes

**TLS 1.3:** Minimal metadata exposed. Usually \`split2\` at SNI position is enough.

**TLS 1.2:** Server certificate is visible. May need strategies for both ClientHello and ServerHello directions. More complex to bypass.

**QUIC/UDP:** IP fragmentation (\`ipfrag2\`) or \`udplen\` padding. Fake-based strategies with ipfrag. QUIC is harder to intercept because it's encrypted from the start.

**HTTP:** Easiest to bypass. \`--hostcase\` alone often works. Combine with split for robust bypass.`,
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
