import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

export const getStatusTool = {
  name: "getStatus",
  description: "Get zapret2 service status: running state, PID, nftables rules count, nfqws2 enabled flag. Use this first to check if zapret2 is running before making changes.",
  schema: z.object({}),
  handler: async () => {
    const script = `
      PID=$(pgrep -x nfqws2 2>/dev/null || echo "")
      RUNNING=false
      if [ -n "$PID" ]; then RUNNING=true; fi

      NFT_COUNT=0
      if command -v nft >/dev/null 2>&1; then
        NFT_COUNT=$(nft list ruleset 2>/dev/null | grep -c zapret 2>/dev/null || echo 0)
      fi

      ENABLED=$(grep -E '^NFQWS2_ENABLE=' /opt/zapret2/config 2>/dev/null | cut -d= -f2 || echo "unknown")

      echo "{\\"running\\": $RUNNING, \\"pid\\": \\"$PID\\", \\"nftRulesCount\\": $NFT_COUNT, \\"nfqws2Enabled\\": \\"$ENABLED\\"}"
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
