import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

export const getConfigTool = {
  name: "getConfig",
  description: "Read zapret2 configuration from /opt/zapret2/config. Optionally filter by a specific key. Common keys: NFQWS2_ENABLE, NFQWS2_OPT, MODE, FWTYPE.",
  schema: z.object({
    key: z.string().optional().describe("Optional config key to read (e.g. NFQWS2_ENABLE, NFQWS2_OPT). If omitted, returns full config."),
  }),
  handler: async (args: { key?: string }) => {
    try {
      let command: string;
      if (args.key) {
        command = `grep -E '^${args.key}=' /opt/zapret2/config || echo "Key '${args.key}' not found"`;
      } else {
        command = "cat /opt/zapret2/config";
      }
      const { stdout } = await getExecutor().exec(command);
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
