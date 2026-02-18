import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const updateConfigTool = {
  name: "updateConfig",
  description: "Update a parameter in zapret2 config (/opt/zapret2/config). Replaces the value of an existing key. Config snapshot saved to resources before change. Restart service to apply.",
  schema: z.object({
    key: z.string().describe("Config key to update (e.g. NFQWS2_ENABLE, NFQWS2_OPT)"),
    value: z.string().describe("New value for the key"),
  }),
  handler: async (args: { key: string; value: string }) => {
    const { key, value } = args;

    const safeKey = key.replace(/[^A-Za-z0-9_]/g, "");
    if (safeKey !== key) {
      return {
        content: [{ type: "text" as const, text: "Error: key must contain only alphanumeric characters and underscores" }],
        isError: true,
      };
    }

    const b64Value = Buffer.from(value).toString("base64");

    try {
      // Snapshot config before change
      const { stdout: configSnapshot } = await getExecutor().exec("cat /opt/zapret2/config");
      saveLog("config", configSnapshot, { key: safeKey, value });

      const script = `
        set -e
        SUDO=""
        [ "$(id -u)" != "0" ] && SUDO="sudo"
        VALUE=$(printf '%s' '${b64Value}' | base64 -d)
        export VALUE
        if grep -qE '^${safeKey}=' /opt/zapret2/config; then
          awk -v key="${safeKey}" 'BEGIN{val=ENVIRON["VALUE"]} $0 ~ "^" key "=" {print key "=\\"" val "\\""; next} {print}' /opt/zapret2/config | $SUDO tee /opt/zapret2/config.tmp > /dev/null
          $SUDO mv /opt/zapret2/config.tmp /opt/zapret2/config
          echo "Updated ${safeKey}"
        else
          printf '%s="%s"\\n' '${safeKey}' "$VALUE" | $SUDO tee -a /opt/zapret2/config > /dev/null
          echo "Added ${safeKey}"
        fi
        NEWVAL=$(grep -E '^${safeKey}=' /opt/zapret2/config)
        echo "$NEWVAL"
      `;
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
