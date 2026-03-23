import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { HaSftpClient } from "../ha/sftp-client.js";

export function registerFileTools(server: McpServer, sftp: HaSftpClient): void {
  server.registerTool(
    "ha_list_files",
    {
      description:
        "List files and directories on the Home Assistant server. Path is relative to /config/ (e.g. 'www' lists /config/www/).",
      inputSchema: {
        path: z
          .string()
          .optional()
          .default("")
          .describe(
            "Directory path relative to /config/. Examples: 'www', 'custom_components', '' (root of /config/)",
          ),
      },
    },
    async ({ path }) => {
      const items = await sftp.list(path || "/config");
      const formatted = items.map((item) => {
        const icon = item.type === "directory" ? "📁" : "📄";
        const size = item.type === "file" ? ` (${formatSize(item.size)})` : "";
        return `${icon} ${item.name}${size}`;
      });
      return {
        content: [
          { type: "text", text: formatted.length > 0 ? formatted.join("\n") : "(empty directory)" },
        ],
      };
    },
  );

  server.registerTool(
    "ha_read_file",
    {
      description: "Read a file from the Home Assistant server. Path is relative to /config/.",
      inputSchema: {
        path: z.string().describe("File path relative to /config/. Example: 'www/mirror.html'"),
      },
    },
    async ({ path }) => {
      const content = await sftp.readFile(path);
      return { content: [{ type: "text", text: content }] };
    },
  );

  server.registerTool(
    "ha_upload_file",
    {
      description:
        "Upload a file from the local machine to the Home Assistant server. Remote path is relative to /config/. Restricted to safe directories (www/, custom_components/, blueprints/, themes/).",
      inputSchema: {
        local_path: z.string().describe("Absolute path to the file on the local machine"),
        remote_path: z
          .string()
          .describe("Destination path on HA relative to /config/. Example: 'www/mirror.html'"),
      },
    },
    async ({ local_path, remote_path }) => {
      await sftp.uploadFile(local_path, remote_path);
      return {
        content: [{ type: "text", text: `Uploaded '${local_path}' → /config/${remote_path}` }],
      };
    },
  );

  server.registerTool(
    "ha_upload_file_content",
    {
      description:
        "Create/overwrite a file on the Home Assistant server with the provided text content. Remote path is relative to /config/. Parent directories are created automatically.",
      inputSchema: {
        content: z.string().describe("The file content to write"),
        remote_path: z
          .string()
          .describe("Destination path on HA relative to /config/. Example: 'www/my-panel.html'"),
      },
    },
    async ({ content, remote_path }) => {
      await sftp.uploadBuffer(content, remote_path);
      return {
        content: [
          {
            type: "text",
            text: `File written to /config/${remote_path} (${formatSize(Buffer.byteLength(content, "utf-8"))})`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_delete_file",
    {
      description:
        "Delete a file from the Home Assistant server. Path is relative to /config/. Restricted to safe directories.",
      inputSchema: {
        path: z.string().describe("File path relative to /config/. Example: 'www/old-file.html'"),
      },
    },
    async ({ path }) => {
      await sftp.deleteFile(path);
      return { content: [{ type: "text", text: `Deleted /config/${path}` }] };
    },
  );

  server.registerTool(
    "ha_mkdir",
    {
      description:
        "Create a directory on the Home Assistant server (recursively). Path is relative to /config/.",
      inputSchema: {
        path: z
          .string()
          .describe("Directory path relative to /config/. Example: 'www/custom-panels'"),
      },
    },
    async ({ path }) => {
      await sftp.mkdir(path);
      return { content: [{ type: "text", text: `Directory created: /config/${path}` }] };
    },
  );

  server.registerTool(
    "ha_file_exists",
    {
      description:
        "Check if a file or directory exists on the Home Assistant server. Path is relative to /config/.",
      inputSchema: {
        path: z.string().describe("Path relative to /config/. Example: 'www/mirror.html'"),
      },
    },
    async ({ path }) => {
      const result = await sftp.exists(path);
      if (result === false) {
        return { content: [{ type: "text", text: `Does not exist: /config/${path}` }] };
      }
      return { content: [{ type: "text", text: `Exists as ${result}: /config/${path}` }] };
    },
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
