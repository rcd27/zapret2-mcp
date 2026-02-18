import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

export const detectSystemTool = {
  name: "detectSystem",
  description: "Detect the target system environment: OS (id, version, pretty name), CPU architecture, init system (systemd/procd/sysv), default WAN interface, DNS resolvers, NFQUEUE kernel module availability, and whether running inside a container. Use this as a first step to determine which workflow (router vs desktop) to follow.",
  schema: z.object({}),
  handler: async () => {
    const script = `
      # OS detection
      OS_ID="unknown"
      OS_VERSION=""
      OS_PRETTY=""
      if [ -f /etc/os-release ]; then
        OS_ID=$(. /etc/os-release && echo "\${ID:-unknown}")
        OS_VERSION=$(. /etc/os-release && echo "\${VERSION_ID:-}")
        OS_PRETTY=$(. /etc/os-release && echo "\${PRETTY_NAME:-}")
      fi

      ARCH=$(uname -m)

      # Init system
      INIT_SYSTEM="unknown"
      if command -v systemctl >/dev/null 2>&1 && systemctl --version >/dev/null 2>&1; then
        INIT_SYSTEM="systemd"
      elif [ -d /etc/rc.d ] || [ -f /etc/init.d/boot ]; then
        INIT_SYSTEM="procd"
      else
        INIT_SYSTEM="sysv"
      fi

      # WAN interface
      WAN_IFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '/dev/{for(i=1;i<=NF;i++){if($i=="dev"){print $(i+1);exit}}}')
      WAN_IFACE=\${WAN_IFACE:-""}

      # DNS resolvers
      DNS_RESOLVERS=""
      if [ -f /etc/resolv.conf ]; then
        DNS_RESOLVERS=$(awk '/^nameserver/{printf "%s,", $2}' /etc/resolv.conf | sed 's/,$//')
      fi

      # NFQUEUE kernel module
      NFQUEUE_MODULE="false"
      if modinfo xt_NFQUEUE >/dev/null 2>&1 || modinfo nfnetlink_queue >/dev/null 2>&1; then
        NFQUEUE_MODULE="true"
      fi

      # Container detection
      IN_CONTAINER="false"
      if [ -f /.dockerenv ] || grep -q 'docker\\|lxc\\|containerd' /proc/1/cgroup 2>/dev/null; then
        IN_CONTAINER="true"
      fi

      # systemd-resolved detection
      RESOLVED_ACTIVE="false"
      if command -v systemctl >/dev/null 2>&1 && systemctl is-active systemd-resolved >/dev/null 2>&1; then
        RESOLVED_ACTIVE="true"
      fi

      cat <<EOJSON
{
  "os": {
    "id": "$OS_ID",
    "version": "$OS_VERSION",
    "pretty": "$OS_PRETTY"
  },
  "arch": "$ARCH",
  "initSystem": "$INIT_SYSTEM",
  "wanInterface": "$WAN_IFACE",
  "dnsResolvers": "$DNS_RESOLVERS",
  "nfqueueModule": $NFQUEUE_MODULE,
  "inContainer": $IN_CONTAINER,
  "systemdResolved": $RESOLVED_ACTIVE
}
EOJSON
    `;

    try {
      const { stdout } = await getExecutor().exec(script, 10000);
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
