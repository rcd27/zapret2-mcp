import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const restartServiceTool = {
  name: "restartService",
  description: "Restart zapret2 service (nfqws2 daemon). Logs saved to resources. Use after updateConfig to apply changes.",
  schema: z.object({}),
  handler: async () => {
    try {
      const { stdout, stderr } = await getExecutor().exec(
        'SUDO=""; [ "$(id -u)" != "0" ] && SUDO="sudo"; $SUDO /opt/zapret2/init.d/sysv/zapret2 restart'
      );
      const output = (stdout + stderr).trim() || "Service restarted";
      saveLog("service", output, { action: "restart" });
      return { content: [{ type: "text" as const, text: output }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      return {
        content: [{ type: "text" as const, text: `Error: ${(e.stdout || "") + (e.stderr || "") || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
