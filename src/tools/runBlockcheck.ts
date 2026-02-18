import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const runBlockcheckTool = {
  name: "runBlockcheck",
  description: "Run blockcheck2.sh to find working network strategies for a domain. Stops zapret2 before running, collects AVAILABLE results. Heavy operation (~5 min). Full log saved to resources. Apply results via updateConfig NFQWS2_OPT.",
  schema: z.object({
    domain: z.string().default("example.com").describe("Domain to test against (default: example.com)"),
    scanLevel: z.enum(["quick", "standard"]).default("quick").describe("Scan depth: quick or standard (default: quick)"),
  }),
  handler: async (args: { domain?: string; scanLevel?: "quick" | "standard" }) => {
    const domain = args.domain || "example.com";
    const scanLevel = args.scanLevel || "quick";

    const scanNum = scanLevel === "quick" ? "1" : "2";

    const script = `
      /opt/zapret2/init.d/sysv/zapret2 stop 2>/dev/null || true

      printf '%s\\n' "${domain}" "${scanNum}" "Y" | /opt/zapret2/blockcheck2.sh 2>&1
    `;

    try {
      const { stdout } = await getExecutor().exec(script, 300000);
      const fullOutput = stdout.trim();

      const ts = saveLog("blockcheck", fullOutput, { domain, scanLevel });

      const filtered = fullOutput
        .split("\n")
        .filter((line) => /AVAILABLE|summary|strategy|nfqws2/i.test(line))
        .join("\n") || "No AVAILABLE strategies found";

      const response = `${filtered}\n\nFull log: zapret2://logs/blockcheck/${ts}`;
      return { content: [{ type: "text" as const, text: response }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      const output = (e.stdout || "") + (e.stderr || "");

      if (output) {
        saveLog("blockcheck", output, { domain, scanLevel, error: "true" });
      }

      return {
        content: [{ type: "text" as const, text: `Error running blockcheck2: ${output || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
