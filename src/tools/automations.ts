import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WsClient } from "../ha/ws-client.js";

export function registerAutomationTools(server: McpServer, ws: WsClient): void {
  server.registerTool(
    "ha_list_automations",
    {
      description: "List all automations in Home Assistant with their IDs, aliases, and states",
    },
    async () => {
      const result = await ws.sendCommand("config/automation/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_automation",
    {
      description: "Get the full configuration of an automation by its ID",
      inputSchema: {
        automation_id: z.string().describe("The automation ID (from ha_list_automations)"),
      },
    },
    async ({ automation_id }) => {
      const result = await ws.sendCommand("config/automation/config", { entity_id: automation_id });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_create_automation",
    {
      description: "Create a new automation in Home Assistant",
      inputSchema: {
        config: z
          .record(z.unknown())
          .describe(
            "Full automation config object. Must include: alias, trigger, action. Optional: condition, mode, description.",
          ),
      },
    },
    async ({ config }) => {
      const result = await ws.sendCommand("config/automation/config", config);
      return {
        content: [
          { type: "text", text: `Automation created.\n${JSON.stringify(result, null, 2)}` },
        ],
      };
    },
  );

  server.registerTool(
    "ha_update_automation",
    {
      description: "Update an existing automation's configuration",
      inputSchema: {
        automation_id: z.string().describe("The automation ID to update"),
        config: z.record(z.unknown()).describe("Updated automation config (same format as create)"),
      },
    },
    async ({ automation_id, config }) => {
      const result = await ws.sendCommand("config/automation/update", {
        automation_id,
        ...config,
      });
      return {
        content: [
          { type: "text", text: `Automation updated.\n${JSON.stringify(result, null, 2)}` },
        ],
      };
    },
  );

  server.registerTool(
    "ha_delete_automation",
    {
      description: "Delete an automation",
      inputSchema: {
        automation_id: z.string().describe("The automation ID to delete"),
      },
    },
    async ({ automation_id }) => {
      await ws.sendCommand("config/automation/delete", { automation_id });
      return { content: [{ type: "text", text: `Automation '${automation_id}' deleted.` }] };
    },
  );
}

export function registerScriptTools(server: McpServer, ws: WsClient): void {
  server.registerTool(
    "ha_list_scripts",
    {
      description: "List all scripts in Home Assistant",
    },
    async () => {
      const result = await ws.sendCommand("config/script/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_create_script",
    {
      description: "Create a new script in Home Assistant",
      inputSchema: {
        object_id: z.string().describe("Unique script ID (e.g. 'morning_routine')"),
        config: z
          .record(z.unknown())
          .describe(
            "Script config. Must include: alias, sequence. Optional: mode, description, icon, fields.",
          ),
      },
    },
    async ({ object_id, config }) => {
      const result = await ws.sendCommand("config/script/config", {
        object_id,
        ...config,
      });
      return {
        content: [{ type: "text", text: `Script created.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_update_script",
    {
      description: "Update an existing script's configuration",
      inputSchema: {
        object_id: z.string().describe("The script ID to update"),
        config: z.record(z.unknown()).describe("Updated script config (same format as create)"),
      },
    },
    async ({ object_id, config }) => {
      const result = await ws.sendCommand("config/script/config", {
        object_id,
        ...config,
      });
      return {
        content: [{ type: "text", text: `Script updated.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_delete_script",
    {
      description: "Delete a script",
      inputSchema: {
        object_id: z.string().describe("The script ID to delete"),
      },
    },
    async ({ object_id }) => {
      await ws.sendCommand("config/script/delete", { object_id });
      return { content: [{ type: "text", text: `Script '${object_id}' deleted.` }] };
    },
  );
}

export function registerSceneTools(server: McpServer, ws: WsClient): void {
  server.registerTool(
    "ha_list_scenes",
    {
      description: "List all scenes in Home Assistant",
    },
    async () => {
      const result = await ws.sendCommand("config/scene/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_create_scene",
    {
      description: "Create a new scene in Home Assistant",
      inputSchema: {
        config: z
          .record(z.unknown())
          .describe(
            "Scene config. Must include: name, entities (map of entity_id to state/attributes).",
          ),
      },
    },
    async ({ config }) => {
      const result = await ws.sendCommand("config/scene/config", config);
      return {
        content: [{ type: "text", text: `Scene created.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_update_scene",
    {
      description: "Update an existing scene's configuration",
      inputSchema: {
        scene_id: z.string().describe("The scene ID to update"),
        config: z.record(z.unknown()).describe("Updated scene config (same format as create)"),
      },
    },
    async ({ scene_id, config }) => {
      const result = await ws.sendCommand("config/scene/config", {
        scene_id,
        ...config,
      });
      return {
        content: [{ type: "text", text: `Scene updated.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_delete_scene",
    {
      description: "Delete a scene",
      inputSchema: {
        scene_id: z.string().describe("The scene ID to delete"),
      },
    },
    async ({ scene_id }) => {
      await ws.sendCommand("config/scene/delete", { scene_id });
      return { content: [{ type: "text", text: `Scene '${scene_id}' deleted.` }] };
    },
  );
}

export function registerHelperTools(server: McpServer, ws: WsClient): void {
  const HELPER_DOMAINS = [
    "input_boolean",
    "input_number",
    "input_text",
    "input_select",
    "input_datetime",
    "input_button",
    "counter",
    "timer",
  ] as const;

  server.registerTool(
    "ha_list_helpers",
    {
      description:
        "List all input helpers (input_boolean, input_number, input_text, input_select, input_datetime, input_button, counter, timer)",
      inputSchema: {
        domain: z
          .string()
          .optional()
          .describe("Filter by domain (e.g. 'input_boolean'). Omit to list all helper types."),
      },
    },
    async ({ domain }) => {
      const domains = domain ? [domain] : HELPER_DOMAINS;
      const results: Record<string, unknown> = {};
      for (const d of domains) {
        try {
          results[d] = await ws.sendCommand(`config/${d}/list`);
        } catch {
          results[d] = "(not available or empty)";
        }
      }
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_create_helper",
    {
      description:
        "Create a new input helper (input_boolean, input_number, input_text, input_select, input_datetime, input_button, counter, timer)",
      inputSchema: {
        domain: z
          .string()
          .describe("Helper domain (e.g. 'input_boolean', 'input_number', 'counter')"),
        config: z
          .record(z.unknown())
          .describe(
            "Helper config. Varies by domain. input_boolean: {name, icon}. input_number: {name, min, max, step, unit_of_measurement, mode}. input_text: {name, min, max, pattern, mode}. input_select: {name, options}. counter: {name, initial, step, minimum, maximum}. timer: {name, duration}.",
          ),
      },
    },
    async ({ domain, config }) => {
      const result = await ws.sendCommand(`config/${domain}/create`, config);
      return {
        content: [{ type: "text", text: `Helper created.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_update_helper",
    {
      description: "Update an existing input helper's configuration",
      inputSchema: {
        domain: z.string().describe("Helper domain (e.g. 'input_boolean')"),
        helper_id: z.string().describe("The helper ID to update"),
        config: z.record(z.unknown()).describe("Updated config fields"),
      },
    },
    async ({ domain, helper_id, config }) => {
      const result = await ws.sendCommand(`config/${domain}/update`, {
        [`${domain}_id`]: helper_id,
        ...config,
      });
      return {
        content: [{ type: "text", text: `Helper updated.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_delete_helper",
    {
      description: "Delete an input helper",
      inputSchema: {
        domain: z.string().describe("Helper domain (e.g. 'input_boolean')"),
        helper_id: z.string().describe("The helper ID to delete"),
      },
    },
    async ({ domain, helper_id }) => {
      await ws.sendCommand(`config/${domain}/delete`, {
        [`${domain}_id`]: helper_id,
      });
      return { content: [{ type: "text", text: `Helper '${helper_id}' (${domain}) deleted.` }] };
    },
  );
}
