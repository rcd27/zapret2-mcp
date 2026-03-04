import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { LocalExecutor } from "../executor/local.js";
import { saveLog } from "../logStore.js";

export const runDpiDetectorTool = {
  name: "runDpiDetector",
  description: "Run dpi-detector Docker image to diagnose DPI blocking types (TLS SNI, TCP throttling, etc.). Heavy operation (~3 min). Full log saved to resources. Use before runBlockcheck to understand what is being blocked.",
  schema: z.object({
    tests: z.string().default("123").describe("Tests to run: 1=TLS DPI, 2=TCP throttling, 3=UDP/QUIC. Combine digits e.g. '123' for all (default: '123')"),
    timeout: z.number().default(180).describe("Timeout in seconds (default: 180)"),
  }),
  handler: async (args: { tests?: string; timeout?: number }) => {
    const tests = args.tests || "123";
    const timeoutSec = args.timeout || 180;

    if (!/^[1234]+$/.test(tests)) {
      return {
        content: [{ type: "text" as const, text: "Invalid tests parameter: must contain only digits 1-4 (e.g. '123')" }],
        isError: true,
      };
    }

    const executor = getExecutor().label.startsWith("docker:") ? new LocalExecutor() : getExecutor();

    const command = `printf '%s\\ny\\n' '${tests}' | timeout ${timeoutSec} docker run --rm -i --network host ghcr.io/runnin4ik/dpi-detector:latest 2>&1 || true`;

    try {
      const { stdout } = await executor.exec(command, (timeoutSec + 10) * 1000);
      const fullOutput = stdout.trim();

      if (!fullOutput) {
        return {
          content: [{ type: "text" as const, text: "Empty output from dpi-detector. Is Docker installed and running? Try: docker pull ghcr.io/runnin4ik/dpi-detector:latest" }],
          isError: true,
        };
      }

      const ts = saveLog("dpi-detector", fullOutput, { tests });

      const response = `${fullOutput}\n\nFull log: zapret2://logs/dpi-detector/${ts}`;
      return { content: [{ type: "text" as const, text: response }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      const output = (e.stdout || "") + (e.stderr || "");

      if (e.stdout && e.stdout.length > 100) {
        const fullOutput = output.trim();
        const ts = saveLog("dpi-detector", fullOutput, { tests, error: "true" });

        const response = `${fullOutput}\n\nFull log: zapret2://logs/dpi-detector/${ts}`;
        return { content: [{ type: "text" as const, text: response }] };
      }

      if (output) {
        saveLog("dpi-detector", output, { tests, error: "true" });
      }

      return {
        content: [{ type: "text" as const, text: `Error running dpi-detector: ${output || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
