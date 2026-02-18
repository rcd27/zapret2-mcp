import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const stopServiceTool = {
  name: "stopService",
  description: "Stop zapret2 service (nfqws2 daemon). Logs saved to resources. Required before runBlockcheck.",
  schema: z.object({}),
  handler: async () => {
    try {
      const { stdout, stderr } = await getExecutor().exec("/opt/zapret2/init.d/sysv/zapret2 stop");
      const output = (stdout + stderr).trim() || "Service stopped";
      saveLog("service", output, { action: "stop" });
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
