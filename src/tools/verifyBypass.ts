import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

export const verifyBypassTool = {
  name: "verifyBypass",
  description: "Verify network connectivity: DNS resolution, HTTP request, and nfqws2 running status for a given domain. Use after startService or restartService to confirm zapret2 is working.",
  schema: z.object({
    domain: z.string().default("example.com").describe("Domain to verify bypass for (default: example.com)"),
    timeout: z.number().default(10).describe("HTTP request timeout in seconds (default: 10)"),
    interface: z.string().optional().describe("WAN interface to bind curl to (e.g. wlp0s20f3). If omitted, reads IFACE_WAN from config."),
  }),
  handler: async (args: { domain?: string; timeout?: number; interface?: string }) => {
    const domain = args.domain || "example.com";
    const timeout = args.timeout || 10;
    const ifaceArg = args.interface || "";

    const script = `
      DNS_RESOLVED="false"
      DNS_IP=""
      IP=$(nslookup "${domain}" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | head -1 | awk '{print $2}')
      if [ -z "$IP" ]; then
        IP=$(getent hosts "${domain}" 2>/dev/null | awk '{print $1}' | head -1)
      fi
      if [ -n "$IP" ]; then
        DNS_RESOLVED="true"
        DNS_IP="$IP"
      fi

      # Determine WAN interface: from argument, then from config
      WAN_IFACE="${ifaceArg}"
      if [ -z "$WAN_IFACE" ] && [ -f /opt/zapret2/config ]; then
        WAN_IFACE=$(grep '^IFACE_WAN=' /opt/zapret2/config 2>/dev/null | head -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
      fi

      # Route info for the resolved IP
      ROUTE_TO=""
      if [ -n "$DNS_IP" ] && command -v ip >/dev/null 2>&1; then
        ROUTE_TO=$(ip route get "$DNS_IP" 2>/dev/null | head -1 || true)
      fi

      HTTP_CODE="0"
      CURL_EXIT="1"
      if command -v curl >/dev/null 2>&1; then
        if [ -n "$WAN_IFACE" ]; then
          HTTP_CODE=$(curl -sL -o /dev/null -w '%{http_code}' \
            --max-time ${timeout} \
            --interface "$WAN_IFACE" \
            --noproxy '*' \
            "https://${domain}/" 2>/dev/null || true)
        else
          HTTP_CODE=$(curl -sL -o /dev/null -w '%{http_code}' \
            --max-time ${timeout} \
            --noproxy '*' \
            "https://${domain}/" 2>/dev/null || true)
        fi
        CURL_EXIT=$?
        if [ -z "$HTTP_CODE" ]; then HTTP_CODE="0"; fi
      fi

      ZAPRET_RUNNING="false"
      if pgrep -x nfqws2 >/dev/null 2>&1; then
        ZAPRET_RUNNING="true"
      fi

      # Check firewall rules
      FW_RULES=0
      SUDO=""
      [ "$(id -u)" != "0" ] && SUDO="sudo"
      if command -v nft >/dev/null 2>&1; then
        FW_RULES=$($SUDO nft list ruleset 2>/dev/null | grep -c zapret 2>/dev/null)
        FW_RULES=\${FW_RULES:-0}
      fi
      if [ "$FW_RULES" -eq 0 ] && command -v iptables >/dev/null 2>&1; then
        FW_RULES=$($SUDO iptables -t mangle -L -n 2>/dev/null | grep -c NFQUEUE 2>/dev/null)
        FW_RULES=\${FW_RULES:-0}
      fi

      BYPASS_CONFIRMED="false"
      if [ "$HTTP_CODE" != "0" ] && [ "$HTTP_CODE" != "000" ] && [ -n "$HTTP_CODE" ]; then
        BYPASS_CONFIRMED="true"
      fi

      WAN_IFACE_JSON=\${WAN_IFACE:-""}

      cat <<EOJSON
{
  "domain": "${domain}",
  "dnsResolved": $DNS_RESOLVED,
  "dnsIp": "$DNS_IP",
  "wanInterface": "$WAN_IFACE_JSON",
  "routeTo": "$ROUTE_TO",
  "httpCode": "$HTTP_CODE",
  "curlExit": "$CURL_EXIT",
  "zapretRunning": $ZAPRET_RUNNING,
  "firewallRulesCount": $FW_RULES,
  "bypassConfirmed": $BYPASS_CONFIRMED
}
EOJSON
    `;

    try {
      const { stdout } = await getExecutor().exec(script, (timeout + 5) * 1000);
      return { content: [{ type: "text" as const, text: stdout.trim() }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      return {
        content: [{ type: "text" as const, text: `Error: ${e.stderr || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
