import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

export const getStatusTool = {
  name: "getStatus",
  description: "Get zapret2 service status: running state, PID, firewall rules count, nfqws2 enabled flag. Use this first to check if zapret2 is running before making changes.",
  schema: z.object({}),
  handler: async () => {
    const script = `
      PID=$(pgrep -x nfqws2 2>/dev/null || echo "")
      RUNNING=false
      if [ -n "$PID" ]; then RUNNING=true; fi

      FW_RULES=0
      FWTYPE=$(grep -E '^FWTYPE=' /opt/zapret2/config 2>/dev/null | cut -d= -f2 || echo "")
      if [ "$FWTYPE" = "nftables" ] && command -v nft >/dev/null 2>&1; then
        FW_RULES=$(nft list ruleset 2>/dev/null | grep -c zapret 2>/dev/null || echo 0)
      elif command -v iptables >/dev/null 2>&1; then
        FW_RULES=$(iptables -t mangle -L -n 2>/dev/null | grep -c NFQUEUE 2>/dev/null || echo 0)
      fi

      ENABLED=$(grep -E '^NFQWS2_ENABLE=' /opt/zapret2/config 2>/dev/null | cut -d= -f2 || echo "unknown")

      echo "{\\"running\\": $RUNNING, \\"pid\\": \\"$PID\\", \\"firewallRulesCount\\": $FW_RULES, \\"fwtype\\": \\"$FWTYPE\\", \\"nfqws2Enabled\\": \\"$ENABLED\\"}"
    `;

    try {
      const { stdout } = await getExecutor().exec(script);
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
