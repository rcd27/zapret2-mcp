import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const installZapretTool = {
  name: "installZapret",
  description: "Install zapret2 from scratch: clone repo, download binaries from GitHub releases, run install_bin.sh, create base config. Skips interactive install_easy.sh. Run checkPrerequisites first. After install, configure with updateConfig and startService.",
  schema: z.object({
    version: z.string().default("v0.9.4.1").describe("zapret2 release version (default: v0.9.4.1)"),
    force: z.boolean().default(false).describe("Force reinstall even if /opt/zapret2 already exists"),
  }),
  handler: async (args: { version?: string; force?: boolean }) => {
    const version = args.version || "v0.9.4.1";
    const force = args.force || false;

    const script = `
      set -e
      SUDO=""
      [ "$(id -u)" != "0" ] && SUDO="sudo"

      if [ -d "/opt/zapret2/.git" ] && [ "${force}" != "true" ]; then
        echo "ALREADY_INSTALLED"
        exit 0
      fi

      # Clone repo
      if [ ! -d "/opt/zapret2/.git" ]; then
        $SUDO rm -rf /opt/zapret2
        $SUDO mkdir -p /opt/zapret2
        $SUDO git clone --depth 1 https://github.com/bol-van/zapret2.git /opt/zapret2
      fi

      # Download and extract binaries
      ARCHIVE="zapret2-${version}.tar.gz"
      cd /tmp
      curl -sLO "https://github.com/bol-van/zapret2/releases/download/${version}/$ARCHIVE"
      tar xzf "$ARCHIVE"
      EXTRACT_DIR=$(echo "$ARCHIVE" | sed 's/.tar.gz//')
      $SUDO cp -r "$EXTRACT_DIR/binaries/"* /opt/zapret2/binaries/
      rm -rf "$EXTRACT_DIR" "$ARCHIVE"

      # Install binaries
      cd /opt/zapret2 && $SUDO sh install_bin.sh

      # Create base config if missing
      if [ ! -f /opt/zapret2/config ]; then
        WAN_IFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '/dev/{for(i=1;i<=NF;i++){if($i=="dev"){print $(i+1);exit}}}')
        WAN_IFACE=\${WAN_IFACE:-}
        if command -v nft >/dev/null 2>&1; then FWTYPE=nftables; else FWTYPE=iptables; fi
        printf '%s\\n' \
          "FWTYPE=$FWTYPE" \
          "MODE=nfqws2" \
          "NFQWS2_ENABLE=0" \
          'NFQWS2_OPT="--payload=http_req --lua-desync=fake"' \
          "FLOWOFFLOAD=none" \
          "IFACE_WAN=$WAN_IFACE" \
          "IFACE_LAN=" \
          "DISABLE_IPV6=1" \
          | $SUDO tee /opt/zapret2/config > /dev/null
      fi

      echo "INSTALL_OK"
      echo "Version: ${version}"
      echo "Binary: $(ls -la /opt/zapret2/nfqws2 2>/dev/null || echo 'not found')"
    `;

    try {
      const { stdout, stderr } = await getExecutor().exec(script, 120000);
      const output = (stdout + stderr).trim();

      if (output.startsWith("ALREADY_INSTALLED")) {
        return {
          content: [{ type: "text" as const, text: "zapret2 is already installed at /opt/zapret2. Use force=true to reinstall." }],
        };
      }

      saveLog("service", output, { action: "install", version });
      return { content: [{ type: "text" as const, text: output }] };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; error?: Error };
      const output = (e.stdout || "") + (e.stderr || "");
      if (output) {
        saveLog("service", output, { action: "install", version, error: "true" });
      }
      return {
        content: [{ type: "text" as const, text: `Error installing zapret2: ${output || e.error?.message || "unknown error"}` }],
        isError: true,
      };
    }
  },
};
