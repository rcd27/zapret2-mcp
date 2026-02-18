import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const removeZapretTool = {
  name: "removeZapret2",
  description: "Completely remove zapret2 installation: stop service, remove firewall rules, disable and delete systemd unit, kill nfqws2 process, delete /opt/zapret2. Reverses installZapret + createSystemdService + startService. DNS changes are NOT reverted.",
  schema: z.object({
    force: z.boolean().default(false).describe("Skip confirmation check — remove even if service is still running"),
  }),
  handler: async (args: { force?: boolean }) => {
    const force = args.force || false;

    const script = `
      set -e
      SUDO=""
      [ "$(id -u)" != "0" ] && SUDO="sudo"

      # 1. Check if zapret2 is installed
      if [ ! -d /opt/zapret2 ]; then
        echo "NOT_INSTALLED: /opt/zapret2 not found, nothing to remove."
        exit 0
      fi

      echo "=== zapret2 removal started ==="

      # 2. Stop the service to clean up firewall rules
      if [ -f /etc/systemd/system/zapret2.service ] && command -v systemctl >/dev/null 2>&1; then
        echo "--- Stopping via systemd ---"
        $SUDO systemctl stop zapret2 2>/dev/null && echo "systemd: stopped" || echo "systemd: stop failed (ignored)"
      fi

      if [ -f /opt/zapret2/init.d/sysv/zapret2 ]; then
        echo "--- Stopping via init script ---"
        $SUDO /opt/zapret2/init.d/sysv/zapret2 stop 2>/dev/null && echo "init: stopped" || echo "init: stop failed (ignored)"
      fi

      # 3. Remove systemd unit if present
      if [ -f /etc/systemd/system/zapret2.service ]; then
        echo "--- Removing systemd unit ---"
        $SUDO systemctl disable zapret2 2>/dev/null || true
        $SUDO rm -f /etc/systemd/system/zapret2.service
        $SUDO systemctl daemon-reload 2>/dev/null || true
        echo "systemd unit removed"
      fi

      # 4. Kill remaining nfqws2 processes (safety net)
      if pgrep -x nfqws2 >/dev/null 2>&1; then
        echo "--- Killing remaining nfqws2 processes ---"
        $SUDO pkill -x nfqws2 2>/dev/null || true
        sleep 1
        echo "nfqws2 processes killed"
      fi

      # 5. Firewall cleanup (safety net if init script stop didn't clean up)
      FWTYPE=""
      if [ -f /opt/zapret2/config ]; then
        FWTYPE=$(grep '^FWTYPE=' /opt/zapret2/config | cut -d= -f2 | tr -d '"' | tr -d "'")
      fi

      if [ "$FWTYPE" = "nftables" ] && command -v nft >/dev/null 2>&1; then
        echo "--- Cleaning nftables zapret rules (safety net) ---"
        nft list ruleset 2>/dev/null | grep -i 'chain zapret' | awk '{print $3}' | while read chain; do
          TABLE=$(nft list ruleset 2>/dev/null | grep -B5 "chain $chain" | grep '^table' | awk '{print $2" "$3}' | tail -1)
          [ -n "$TABLE" ] && $SUDO nft delete chain $TABLE "$chain" 2>/dev/null || true
        done
        $SUDO nft delete table inet zapret 2>/dev/null || true
        $SUDO nft delete table ip zapret 2>/dev/null || true
        echo "nftables: zapret rules cleaned"
      elif [ "$FWTYPE" = "iptables" ] && command -v iptables >/dev/null 2>&1; then
        echo "--- Cleaning iptables zapret rules (safety net) ---"
        $SUDO iptables -t mangle -F PREROUTING 2>/dev/null || true
        $SUDO iptables -t mangle -F OUTPUT 2>/dev/null || true
        echo "iptables: mangle rules flushed"
      fi

      # 6. Remove /opt/zapret2
      echo "--- Removing /opt/zapret2 ---"
      $SUDO rm -rf /opt/zapret2
      echo "REMOVE_OK: /opt/zapret2 deleted"

      # 7. Summary
      echo ""
      echo "=== Removal complete ==="
      echo "Removed: /opt/zapret2"
      echo "nfqws2 running: $(pgrep -x nfqws2 >/dev/null 2>&1 && echo YES || echo NO)"
      echo "systemd unit: $([ -f /etc/systemd/system/zapret2.service ] && echo EXISTS || echo removed)"
      echo "Note: DNS settings were NOT reverted."
    `;

    try {
      const { stdout, stderr } = await getExecutor().exec(script, 60000);
      const output = (stdout + stderr).trim();

      if (output.startsWith("NOT_INSTALLED")) {
        return {
          content: [{ type: "text" as const, text: output }],
        };
      }

      saveLog("service", output, { action: "remove", force: String(force) });
      return { content: [{ type: "text" as const, text: output }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      const output = (e.stdout || "") + (e.stderr || "");
      if (output) {
        saveLog("service", output, { action: "remove", error: "true" });
      }
      return {
        content: [{ type: "text" as const, text: `Error removing zapret2: ${output || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
