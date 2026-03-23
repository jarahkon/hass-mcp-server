import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WsClient } from "../ha/ws-client.js";

export function registerDashboardTools(server: McpServer, ws: WsClient): void {
  server.registerTool(
    "ha_list_dashboards",
    {
      description: "List all Lovelace dashboards in Home Assistant",
    },
    async () => {
      const result = await ws.sendCommand("lovelace/dashboards/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_create_dashboard",
    {
      description: "Create a new Lovelace dashboard",
      inputSchema: {
        url_path: z
          .string()
          .describe(
            "URL path for the dashboard (e.g. 'tablet', 'kitchen'). Will be accessible at /lovelace-{url_path}/",
          ),
        title: z.string().describe("Display title for the dashboard"),
        icon: z.string().optional().describe("Material Design icon (e.g. 'mdi:tablet')"),
        require_admin: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to require admin access"),
        show_in_sidebar: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to show in the sidebar"),
      },
    },
    async ({ url_path, title, icon, require_admin, show_in_sidebar }) => {
      const result = await ws.sendCommand("lovelace/dashboards/create", {
        url_path,
        title,
        icon,
        require_admin,
        show_in_sidebar,
        mode: "storage",
      });
      return {
        content: [
          {
            type: "text",
            text: `Dashboard created successfully.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_update_dashboard",
    {
      description: "Update an existing Lovelace dashboard's properties (title, icon, etc.)",
      inputSchema: {
        dashboard_id: z.string().describe("The dashboard ID (numeric, from ha_list_dashboards)"),
        title: z.string().optional().describe("New display title"),
        icon: z.string().optional().describe("New icon (e.g. 'mdi:tablet')"),
        require_admin: z.boolean().optional().describe("Whether to require admin access"),
        show_in_sidebar: z.boolean().optional().describe("Whether to show in sidebar"),
      },
    },
    async ({ dashboard_id, ...updates }) => {
      const payload: Record<string, unknown> = { dashboard_id };
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) payload[key] = value;
      }
      const result = await ws.sendCommand("lovelace/dashboards/update", payload);
      return {
        content: [{ type: "text", text: `Dashboard updated.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_delete_dashboard",
    {
      description: "Delete a Lovelace dashboard",
      inputSchema: {
        dashboard_id: z.string().describe("The dashboard ID (numeric, from ha_list_dashboards)"),
      },
    },
    async ({ dashboard_id }) => {
      await ws.sendCommand("lovelace/dashboards/delete", { dashboard_id });
      return {
        content: [{ type: "text", text: `Dashboard '${dashboard_id}' deleted successfully.` }],
      };
    },
  );

  server.registerTool(
    "ha_get_dashboard_config",
    {
      description: "Get the full Lovelace configuration of a dashboard (all views, cards, etc.)",
      inputSchema: {
        url_path: z
          .string()
          .optional()
          .describe("Dashboard URL path (e.g. 'tablet'). Omit for default dashboard."),
      },
    },
    async ({ url_path }) => {
      const payload: Record<string, unknown> = {};
      if (url_path) payload.url_path = url_path;
      const result = await ws.sendCommand("lovelace/config", payload);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_save_dashboard_config",
    {
      description:
        "Save/overwrite the full Lovelace configuration of a dashboard. Provide the complete config with views and cards.",
      inputSchema: {
        url_path: z
          .string()
          .optional()
          .describe("Dashboard URL path (e.g. 'tablet'). Omit for default dashboard."),
        config: z
          .record(z.unknown())
          .describe(
            "Full Lovelace configuration object with 'views' array. Example: { views: [{ title: 'Home', cards: [...] }] }",
          ),
      },
    },
    async ({ url_path, config }) => {
      const payload: Record<string, unknown> = { config };
      if (url_path) payload.url_path = url_path;
      await ws.sendCommand("lovelace/config/save", payload);
      return {
        content: [
          {
            type: "text",
            text: `Dashboard config saved successfully${url_path ? ` for '${url_path}'` : " for default dashboard"}.`,
          },
        ],
      };
    },
  );
}
