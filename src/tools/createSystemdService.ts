import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const createSystemdServiceTool = {
  name: "createSystemdService",
  description: "Create a systemd service unit for zapret2 on Linux desktop systems. Generates /etc/systemd/system/zapret2.service, runs daemon-reload, and optionally enables the service for autostart. Requires systemd — use detectSystem first to verify.",
  schema: z.object({
    enable: z.boolean().default(true).describe("Enable service for autostart (default: true)"),
  }),
  handler: async (args: { enable?: boolean }) => {
    const enable = args.enable !== false;

    const unitContent = `[Unit]
Description=zapret2 network packet processing service
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
ExecStart=/opt/zapret2/init.d/sysv/zapret2 start
ExecStop=/opt/zapret2/init.d/sysv/zapret2 stop
ExecReload=/opt/zapret2/init.d/sysv/zapret2 restart
RemainAfterExit=yes
Restart=no

[Install]
WantedBy=multi-user.target`;

    const b64Unit = Buffer.from(unitContent).toString("base64");

    const script = `
      set -e
      SUDO=""
      [ "$(id -u)" != "0" ] && SUDO="sudo"

      if ! command -v systemctl >/dev/null 2>&1; then
        echo "ERROR: systemctl not found. This tool requires systemd."
        exit 1
      fi

      if ! systemctl --version >/dev/null 2>&1; then
        echo "ERROR: systemd is not running."
        exit 1
      fi

      if [ ! -d /opt/zapret2 ]; then
        echo "ERROR: /opt/zapret2 not found. Run installZapret first."
        exit 1
      fi

      # Write unit file
      printf '%s' '${b64Unit}' | base64 -d | $SUDO tee /etc/systemd/system/zapret2.service > /dev/null

      $SUDO systemctl daemon-reload

      ${enable ? '$SUDO systemctl enable zapret2.service' : 'echo "Service not enabled (enable=false)"'}

      echo "UNIT_CREATED"
      echo "Path: /etc/systemd/system/zapret2.service"
      echo "Enabled: ${enable}"
      systemctl status zapret2.service --no-pager 2>&1 || true
    `;

    try {
      const { stdout, stderr } = await getExecutor().exec(script, 30000);
      const output = (stdout + stderr).trim();

      saveLog("service", output, { action: "createSystemdService", enable: String(enable) });

      return { content: [{ type: "text" as const, text: output }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      return {
        content: [{ type: "text" as const, text: `Error: ${e.stderr || e.stdout || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
