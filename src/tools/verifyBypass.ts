import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

// FIXME: отшлёпывает 200 на любой запрос. Выяснить, в чём дело
export const verifyBypassTool = {
  name: "verifyBypass",
  description: "Verify network connectivity: DNS resolution, HTTP request, and nfqws2 running status for a given domain. Use after startService or restartService to confirm zapret2 is working.",
  schema: z.object({
    domain: z.string().default("example.com").describe("Domain to verify bypass for (default: example.com)"),
    timeout: z.number().default(10).describe("HTTP request timeout in seconds (default: 10)"),
  }),
  handler: async (args: { domain?: string; timeout?: number }) => {
    const domain = args.domain || "example.com";
    const timeout = args.timeout || 10;

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

      HTTP_CODE="0"
      CURL_EXIT="0"
      if command -v curl >/dev/null 2>&1; then
        HTTP_CODE=$(curl -sL -o /dev/null -w '%{http_code}' --max-time ${timeout} "https://${domain}/" 2>/dev/null || true)
        CURL_EXIT=$?
        if [ -z "$HTTP_CODE" ]; then HTTP_CODE="0"; fi
      fi

      ZAPRET_RUNNING="false"
      if pgrep -x nfqws2 >/dev/null 2>&1; then
        ZAPRET_RUNNING="true"
      fi

      # Check firewall rules
      FW_RULES=0
      if command -v nft >/dev/null 2>&1; then
        FW_RULES=$(nft list ruleset 2>/dev/null | grep -c zapret 2>/dev/null || echo 0)
      fi
      if [ "$FW_RULES" -eq 0 ] && command -v iptables >/dev/null 2>&1; then
        FW_RULES=$(iptables -t mangle -L -n 2>/dev/null | grep -c NFQUEUE 2>/dev/null || echo 0)
      fi

      BYPASS_CONFIRMED="false"
      if [ "$ZAPRET_RUNNING" = "true" ] && [ "$FW_RULES" -gt 0 ] && [ "$HTTP_CODE" != "0" ] && [ "$HTTP_CODE" != "" ]; then
        BYPASS_CONFIRMED="true"
      fi

      cat <<EOJSON
{
  "domain": "${domain}",
  "dnsResolved": $DNS_RESOLVED,
  "dnsIp": "$DNS_IP",
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
