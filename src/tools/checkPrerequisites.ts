import { z } from "zod";
import { getExecutor } from "../executorInstance.js";

export const checkPrerequisitesTool = {
  name: "checkPrerequisites",
  description: "Check environment prerequisites for zapret2: required tools, architecture, network connectivity, existing installation. Run this before installZapret to verify environment.",
  schema: z.object({}),
  handler: async () => {
    const script = `
      check_cmd() {
        if command -v "$1" >/dev/null 2>&1; then echo "true"; else echo "false"; fi
      }

      ARCH=$(uname -m)
      HAS_NFT=$(check_cmd nft)
      HAS_IPTABLES=$(check_cmd iptables)
      HAS_IPSET=$(check_cmd ipset)
      HAS_CURL=$(check_cmd curl)
      HAS_GREP=$(check_cmd grep)
      HAS_SED=$(check_cmd sed)
      HAS_AWK=$(check_cmd awk)
      HAS_GIT=$(check_cmd git)
      HAS_BASE64=$(check_cmd base64)

      ZAPRET_DIR="false"
      if [ -d "/opt/zapret2" ]; then ZAPRET_DIR="true"; fi

      NFQWS_BIN="false"
      if [ -x "/opt/zapret2/nfq2/nfqws2" ]; then NFQWS_BIN="true"; fi

      NETWORK="false"
      if curl -sI --max-time 5 https://github.com >/dev/null 2>&1; then NETWORK="true"; fi

      # OS detection
      OS_ID="unknown"
      OS_VERSION=""
      OS_PRETTY=""
      if [ -f /etc/os-release ]; then
        OS_ID=$(. /etc/os-release && echo "\${ID:-unknown}")
        OS_VERSION=$(. /etc/os-release && echo "\${VERSION_ID:-}")
        OS_PRETTY=$(. /etc/os-release && echo "\${PRETTY_NAME:-}")
      fi

      # Init system
      INIT_SYSTEM="unknown"
      if command -v systemctl >/dev/null 2>&1 && systemctl --version >/dev/null 2>&1; then
        INIT_SYSTEM="systemd"
      elif [ -d /etc/rc.d ] || [ -f /etc/init.d/boot ]; then
        INIT_SYSTEM="procd"
      else
        INIT_SYSTEM="sysv"
      fi

      # NFQUEUE kernel module
      NFQUEUE_MODULE="false"
      if modinfo xt_NFQUEUE >/dev/null 2>&1 || modinfo nfnetlink_queue >/dev/null 2>&1; then
        NFQUEUE_MODULE="true"
      fi

      # WAN interface
      WAN_IFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '/dev/{for(i=1;i<=NF;i++){if($i=="dev"){print $(i+1);exit}}}')
      WAN_IFACE=\${WAN_IFACE:-""}

      # DNS resolvers
      DNS_RESOLVERS=""
      if [ -f /etc/resolv.conf ]; then
        DNS_RESOLVERS=$(awk '/^nameserver/{printf "%s,", $2}' /etc/resolv.conf | sed 's/,$//')
      fi

      # Container detection
      IN_CONTAINER="false"
      if [ -f /.dockerenv ] || grep -q 'docker\|lxc\|containerd' /proc/1/cgroup 2>/dev/null; then
        IN_CONTAINER="true"
      fi

      cat <<EOJSON
{
  "arch": "$ARCH",
  "os": {
    "id": "$OS_ID",
    "version": "$OS_VERSION",
    "pretty": "$OS_PRETTY"
  },
  "initSystem": "$INIT_SYSTEM",
  "tools": {
    "nft": $HAS_NFT,
    "iptables": $HAS_IPTABLES,
    "ipset": $HAS_IPSET,
    "curl": $HAS_CURL,
    "grep": $HAS_GREP,
    "sed": $HAS_SED,
    "awk": $HAS_AWK,
    "git": $HAS_GIT,
    "base64": $HAS_BASE64
  },
  "zapretDirExists": $ZAPRET_DIR,
  "nfqwsBinaryExists": $NFQWS_BIN,
  "networkConnectivity": $NETWORK,
  "nfqueueModule": $NFQUEUE_MODULE,
  "wanInterface": "$WAN_IFACE",
  "dnsResolvers": "$DNS_RESOLVERS",
  "inContainer": $IN_CONTAINER
}
EOJSON
    `;

    try {
      const { stdout } = await getExecutor().exec(script, 15000);
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
