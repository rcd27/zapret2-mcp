import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

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

      cat <<EOJSON
{
  "domain": "${domain}",
  "dnsResolved": $DNS_RESOLVED,
  "dnsIp": "$DNS_IP",
  "httpCode": "$HTTP_CODE",
  "curlExit": "$CURL_EXIT",
  "zapretRunning": $ZAPRET_RUNNING
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
