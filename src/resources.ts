import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listLogs, readLog, LogType } from "./logStore.js";

const VALID_TYPES: LogType[] = ["blockcheck", "service", "config"];

export function registerResources(server: McpServer): void {
  const template = new ResourceTemplate("zapret2://logs/{type}/{timestamp}", {
    list: async () => {
      const entries = listLogs();
      return {
        resources: entries.map((e) => ({
          uri: e.uri,
          name: `${e.type}/${e.timestamp}`,
          mimeType: "text/plain" as const,
          description: Object.entries(e.meta)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ") || undefined,
        })),
      };
    },
  });

  server.resource("zapret2-logs", template, { mimeType: "text/plain" }, async (uri, variables) => {
    const type = variables.type as string;
    const timestamp = variables.timestamp as string;

    if (!VALID_TYPES.includes(type as LogType)) {
      throw new Error(`Invalid log type: ${type}. Must be one of: ${VALID_TYPES.join(", ")}`);
    }

    const content = readLog(type as LogType, timestamp);
    if (content === null) {
      throw new Error(`Log not found: ${type}/${timestamp}`);
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain" as const,
          text: content,
        },
      ],
    };
  });
}
