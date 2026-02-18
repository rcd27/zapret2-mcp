import { z } from "zod";
import { getExecutor } from "../executorInstance.js";
import { saveLog } from "../logStore.js";

export const configureDnsTool = {
  name: "configureDns",
  description: "Configure DNS resolver. Supports two methods: direct /etc/resolv.conf editing or systemd-resolved configuration. Backs up existing config before changes. Verifies DNS resolution after applying. Use detectSystem first to determine which method is appropriate.",
  schema: z.object({
    resolver: z.enum(["1.1.1.1", "8.8.8.8", "9.9.9.9", "custom"]).describe("DNS resolver to use (or 'custom' with customResolver)"),
    customResolver: z.string().optional().describe("Custom DNS resolver IP (required when resolver='custom')"),
    method: z.enum(["resolv.conf", "systemd-resolved"]).describe("Configuration method: 'resolv.conf' for direct editing, 'systemd-resolved' for systemd systems"),
  }),
  handler: async (args: { resolver: string; customResolver?: string; method: string }) => {
    const { resolver, customResolver, method } = args;

    const dnsIp = resolver === "custom" ? customResolver : resolver;

    if (!dnsIp) {
      return {
        content: [{ type: "text" as const, text: "Error: customResolver is required when resolver='custom'" }],
        isError: true,
      };
    }

    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(dnsIp)) {
      return {
        content: [{ type: "text" as const, text: `Error: invalid IP address: ${dnsIp}` }],
        isError: true,
      };
    }

    const b64Ip = Buffer.from(dnsIp).toString("base64");

    let script: string;

    if (method === "systemd-resolved") {
      script = `
        set -e
        DNS_IP=$(printf '%s' '${b64Ip}' | base64 -d)

        if ! command -v systemctl >/dev/null 2>&1; then
          echo "ERROR: systemctl not found"
          exit 1
        fi

        if ! systemctl is-active systemd-resolved >/dev/null 2>&1; then
          echo "ERROR: systemd-resolved is not active"
          exit 1
        fi

        # Backup current resolved config
        RESOLVED_CONF="/etc/systemd/resolved.conf"
        if [ -f "$RESOLVED_CONF" ]; then
          cp "$RESOLVED_CONF" "$RESOLVED_CONF.bak"
        fi

        # Update DNS setting
        if grep -q '^DNS=' "$RESOLVED_CONF" 2>/dev/null; then
          sed -i "s/^DNS=.*/DNS=$DNS_IP/" "$RESOLVED_CONF"
        elif grep -q '^#DNS=' "$RESOLVED_CONF" 2>/dev/null; then
          sed -i "s/^#DNS=.*/DNS=$DNS_IP/" "$RESOLVED_CONF"
        else
          printf '\\n[Resolve]\\nDNS=%s\\n' "$DNS_IP" >> "$RESOLVED_CONF"
        fi

        systemctl restart systemd-resolved

        # Verify
        VERIFY=$(nslookup example.com 2>&1 | head -5 || true)
        echo "DNS configured via systemd-resolved: $DNS_IP"
        echo "Verification:"
        echo "$VERIFY"
      `;
    } else {
      script = `
        set -e
        DNS_IP=$(printf '%s' '${b64Ip}' | base64 -d)

        # Backup current resolv.conf
        if [ -f /etc/resolv.conf ]; then
          cp /etc/resolv.conf /etc/resolv.conf.bak
          BACKUP_CONTENT=$(cat /etc/resolv.conf)
        else
          BACKUP_CONTENT=""
        fi

        printf 'nameserver %s\\n' "$DNS_IP" > /etc/resolv.conf

        # Verify
        VERIFY=$(nslookup example.com 2>&1 | head -5 || true)
        echo "DNS configured via resolv.conf: $DNS_IP"
        echo "Previous config backed up to /etc/resolv.conf.bak"
        echo "Verification:"
        echo "$VERIFY"
      `;
    }

    try {
      const { stdout, stderr } = await getExecutor().exec(script, 15000);
      const output = (stdout + stderr).trim();

      saveLog("config", output, { action: "configureDns", resolver: dnsIp, method });

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
