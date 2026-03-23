import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RestClient } from "../ha/rest-client.js";

export function registerAddonTools(server: McpServer, rest: RestClient): void {
  server.registerTool(
    "ha_list_addons",
    {
      description: "List all installed Home Assistant add-ons with their status",
    },
    async () => {
      const result = await rest.get<{ data: { addons: unknown[] } }>("/api/hassio/addons");
      return {
        content: [{ type: "text", text: JSON.stringify(result.data?.addons ?? result, null, 2) }],
      };
    },
  );

  server.registerTool(
    "ha_addon_info",
    {
      description: "Get detailed information about a specific add-on",
      inputSchema: {
        slug: z
          .string()
          .describe(
            "Add-on slug (e.g. 'a0d7b954_ssh', 'core_configurator'). Get slugs from ha_list_addons.",
          ),
      },
    },
    async ({ slug }) => {
      const result = await rest.get(`/api/hassio/addons/${encodeURIComponent(slug)}/info`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_install_addon",
    {
      description: "Install a Home Assistant add-on by slug",
      inputSchema: {
        slug: z.string().describe("Add-on slug to install"),
      },
    },
    async ({ slug }) => {
      await rest.post(`/api/hassio/addons/${encodeURIComponent(slug)}/install`);
      return { content: [{ type: "text", text: `Add-on '${slug}' installed successfully.` }] };
    },
  );

  server.registerTool(
    "ha_start_addon",
    {
      description: "Start a Home Assistant add-on",
      inputSchema: {
        slug: z.string().describe("Add-on slug to start"),
      },
    },
    async ({ slug }) => {
      await rest.post(`/api/hassio/addons/${encodeURIComponent(slug)}/start`);
      return { content: [{ type: "text", text: `Add-on '${slug}' started.` }] };
    },
  );

  server.registerTool(
    "ha_stop_addon",
    {
      description: "Stop a running Home Assistant add-on",
      inputSchema: {
        slug: z.string().describe("Add-on slug to stop"),
      },
    },
    async ({ slug }) => {
      await rest.post(`/api/hassio/addons/${encodeURIComponent(slug)}/stop`);
      return { content: [{ type: "text", text: `Add-on '${slug}' stopped.` }] };
    },
  );

  server.registerTool(
    "ha_restart_addon",
    {
      description: "Restart a Home Assistant add-on",
      inputSchema: {
        slug: z.string().describe("Add-on slug to restart"),
      },
    },
    async ({ slug }) => {
      await rest.post(`/api/hassio/addons/${encodeURIComponent(slug)}/restart`);
      return { content: [{ type: "text", text: `Add-on '${slug}' restarted.` }] };
    },
  );

  server.registerTool(
    "ha_uninstall_addon",
    {
      description: "Uninstall a Home Assistant add-on",
      inputSchema: {
        slug: z.string().describe("Add-on slug to uninstall"),
      },
    },
    async ({ slug }) => {
      await rest.post(`/api/hassio/addons/${encodeURIComponent(slug)}/uninstall`);
      return { content: [{ type: "text", text: `Add-on '${slug}' uninstalled.` }] };
    },
  );

  server.registerTool(
    "ha_addon_options",
    {
      description: "Get or set configuration options for an add-on",
      inputSchema: {
        slug: z.string().describe("Add-on slug"),
        options: z
          .record(z.unknown())
          .optional()
          .describe("New options to set. Omit to get current options."),
      },
    },
    async ({ slug, options }) => {
      if (options) {
        await rest.post(`/api/hassio/addons/${encodeURIComponent(slug)}/options`, { options });
        return { content: [{ type: "text", text: `Options updated for '${slug}'.` }] };
      }
      const result = await rest.get(`/api/hassio/addons/${encodeURIComponent(slug)}/info`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              (result as { data?: { options?: unknown } })?.data?.options ?? result,
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}

export function registerSystemTools(server: McpServer, rest: RestClient): void {
  server.registerTool(
    "ha_system_info",
    {
      description:
        "Get Home Assistant system information (core version, OS, supervisor, host info)",
    },
    async () => {
      const results: Record<string, unknown> = {};
      const endpoints = [
        ["/api/hassio/info", "supervisor"],
        ["/api/hassio/core/info", "core"],
        ["/api/hassio/host/info", "host"],
        ["/api/hassio/os/info", "os"],
      ] as const;

      for (const [endpoint, key] of endpoints) {
        try {
          results[key] = await rest.get(endpoint);
        } catch {
          results[key] = "(unavailable)";
        }
      }
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_check_config",
    {
      description:
        "Validate the Home Assistant configuration. Run this before reloading to catch errors.",
    },
    async () => {
      const result = await rest.post("/api/config/core/check_config");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_create_backup",
    {
      description: "Create a Home Assistant backup",
      inputSchema: {
        name: z.string().optional().describe("Backup name. Defaults to timestamp."),
        partial: z
          .boolean()
          .optional()
          .default(false)
          .describe("Create a partial backup instead of full backup"),
        folders: z
          .array(z.string())
          .optional()
          .describe("For partial backup: folders to include (e.g. ['config', 'share'])"),
        addons: z
          .array(z.string())
          .optional()
          .describe("For partial backup: add-on slugs to include"),
      },
    },
    async ({ name, partial, folders, addons }) => {
      const backupName = name || `Backup ${new Date().toISOString().slice(0, 16)}`;

      if (partial) {
        const body: Record<string, unknown> = { name: backupName };
        if (folders) body.folders = folders;
        if (addons) body.addons = addons;
        const result = await rest.post("/api/hassio/backups/new/partial", body);
        return {
          content: [
            {
              type: "text",
              text: `Partial backup created: ${backupName}\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      const result = await rest.post("/api/hassio/backups/new/full", { name: backupName });
      return {
        content: [
          {
            type: "text",
            text: `Full backup created: ${backupName}\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_list_backups",
    {
      description: "List all Home Assistant backups",
    },
    async () => {
      const result = await rest.get("/api/hassio/backups");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_restart_core",
    {
      description: "Restart the Home Assistant core. This will briefly make HA unavailable.",
    },
    async () => {
      await rest.post("/api/hassio/core/restart");
      return {
        content: [
          {
            type: "text",
            text: "Home Assistant core restart initiated. HA will be briefly unavailable.",
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_check_api",
    {
      description: "Check if the Home Assistant API is accessible and responding",
    },
    async () => {
      const result = await rest.get<{ message: string }>("/api/");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_config",
    {
      description:
        "Get the Home Assistant configuration (location, unit system, version, components, etc.)",
    },
    async () => {
      const result = await rest.get("/api/config");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_components",
    {
      description: "List all currently loaded Home Assistant integrations/components",
    },
    async () => {
      const config = await rest.get<{ components: string[] }>("/api/config");
      const components = config.components ?? [];
      return { content: [{ type: "text", text: JSON.stringify(components.sort(), null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_error_log",
    {
      description: "Get the Home Assistant error log contents",
    },
    async () => {
      const result = await rest.get<string>("/api/error_log");
      return {
        content: [
          { type: "text", text: typeof result === "string" ? result : JSON.stringify(result) },
        ],
      };
    },
  );
}
