import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const runBlockcheckTool = {
  name: "runBlockcheck",
  description: "Run blockcheck2.sh to find working network strategies for a domain. Stops zapret2 before running, collects AVAILABLE results. Heavy operation (~5 min). Full log saved to resources. Apply results via updateConfig NFQWS2_OPT.",
  schema: z.object({
    domain: z.string().default("example.com").describe("Domain to test against (default: example.com)"),
    ipVersion: z.enum(["4", "6", "46"]).default("4").describe("IP protocol version: 4, 6 or 46 for both (default: 4)"),
  }),
  handler: async (args: { domain?: string; ipVersion?: "4" | "6" | "46" }) => {
    const domain = args.domain || "example.com";
    const ipVersion = args.ipVersion || "4";

    const script = `
      SUDO=""
      [ "$(id -u)" != "0" ] && SUDO="sudo"

      # Stop service (systemd-aware)
      if [ -f /etc/systemd/system/zapret2.service ]; then
        $SUDO systemctl stop zapret2 2>/dev/null || true
      else
        $SUDO /opt/zapret2/init.d/sysv/zapret2 stop 2>/dev/null || true
      fi

      # Run blockcheck in its own process group
      # blockcheck2.sh interactive stdin: test_number, domain, ip_version
      setsid sh -c "printf '%s\\n' '1' '${domain}' '${ipVersion}' | $SUDO /opt/zapret2/blockcheck2.sh 2>&1" 2>&1
      BC_EXIT=$?

      # Cleanup: kill leftover nfqws2 processes spawned by blockcheck
      $SUDO pkill -f 'nfqws2.*--dpi-desync' 2>/dev/null || true

      # Cleanup: flush mangle rules that blockcheck may have added
      if command -v iptables >/dev/null 2>&1; then
        $SUDO iptables -t mangle -F 2>/dev/null || true
      fi
      if command -v ip6tables >/dev/null 2>&1; then
        $SUDO ip6tables -t mangle -F 2>/dev/null || true
      fi

      exit $BC_EXIT
    `;

    try {
      const { stdout } = await getExecutor().exec(script, 300000);
      const fullOutput = stdout.trim();

      const ts = saveLog("blockcheck", fullOutput, { domain, ipVersion });

      const filtered = fullOutput
        .split("\n")
        .filter((line) => /AVAILABLE|summary|strategy|nfqws2/i.test(line))
        .join("\n") || "No AVAILABLE strategies found";

      const response = `${filtered}\n\nFull log: zapret2://logs/blockcheck/${ts}`;
      return { content: [{ type: "text" as const, text: response }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      const output = (e.stdout || "") + (e.stderr || "");

      // blockcheck2.sh may exit non-zero even with valid output (e.g. no strategy found)
      if (e.stdout && e.stdout.length > 100) {
        const fullOutput = output.trim();
        const ts = saveLog("blockcheck", fullOutput, { domain, ipVersion });

        const filtered = fullOutput
          .split("\n")
          .filter((line) => /AVAILABLE|summary|strategy|nfqws2/i.test(line))
          .join("\n") || "No AVAILABLE strategies found";

        const response = `${filtered}\n\nFull log: zapret2://logs/blockcheck/${ts}`;
        return { content: [{ type: "text" as const, text: response }] };
      }

      if (output) {
        saveLog("blockcheck", output, { domain, ipVersion, error: "true" });
      }

      return {
        content: [{ type: "text" as const, text: `Error running blockcheck2: ${output || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
