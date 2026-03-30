import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RestClient } from "../ha/rest-client.js";
import type { WsClient } from "../ha/ws-client.js";

export function registerAutomationTools(server: McpServer, rest: RestClient): void {
  server.registerTool(
    "ha_list_automations",
    {
      description: "List all automations in Home Assistant with their IDs, aliases, and states",
    },
    async () => {
      const states =
        await rest.get<
          Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
        >("/api/states");
      const automations = states
        .filter((s) => s.entity_id.startsWith("automation."))
        .map((s) => ({
          entity_id: s.entity_id,
          state: s.state,
          alias: s.attributes.friendly_name,
          id: s.attributes.id,
          last_triggered: s.attributes.last_triggered,
        }));
      return { content: [{ type: "text", text: JSON.stringify(automations, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_automation",
    {
      description: "Get the full configuration of an automation by its ID",
      inputSchema: {
        automation_id: z
          .string()
          .describe("The automation config key/ID (the 'id' field from ha_list_automations)"),
      },
    },
    async ({ automation_id }) => {
      const result = await rest.get(
        `/api/config/automation/config/${encodeURIComponent(automation_id)}`,
      );
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
            "Full automation config object. Must include: alias, trigger/triggers, action/actions. Optional: condition/conditions, mode, description.",
          ),
      },
    },
    async ({ config }) => {
      const id = crypto.randomUUID();
      const result = await rest.post(
        `/api/config/automation/config/${encodeURIComponent(id)}`,
        config,
      );
      return {
        content: [
          {
            type: "text",
            text: `Automation created (id: ${id}).\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_update_automation",
    {
      description: "Update an existing automation's configuration",
      inputSchema: {
        automation_id: z.string().describe("The automation config key/ID to update"),
        config: z.record(z.unknown()).describe("Updated automation config (same format as create)"),
      },
    },
    async ({ automation_id, config }) => {
      const result = await rest.post(
        `/api/config/automation/config/${encodeURIComponent(automation_id)}`,
        config,
      );
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
        automation_id: z.string().describe("The automation config key/ID to delete"),
      },
    },
    async ({ automation_id }) => {
      await rest.delete(
        `/api/config/automation/config/${encodeURIComponent(automation_id)}`,
      );
      return { content: [{ type: "text", text: `Automation '${automation_id}' deleted.` }] };
    },
  );
}

export function registerScriptTools(server: McpServer, rest: RestClient): void {
  server.registerTool(
    "ha_list_scripts",
    {
      description: "List all scripts in Home Assistant",
    },
    async () => {
      const states =
        await rest.get<
          Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
        >("/api/states");
      const scripts = states
        .filter((s) => s.entity_id.startsWith("script."))
        .map((s) => ({
          entity_id: s.entity_id,
          object_id: s.entity_id.replace("script.", ""),
          state: s.state,
          alias: s.attributes.friendly_name,
          last_triggered: s.attributes.last_triggered,
        }));
      return { content: [{ type: "text", text: JSON.stringify(scripts, null, 2) }] };
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
      const result = await rest.post(
        `/api/config/script/config/${encodeURIComponent(object_id)}`,
        config,
      );
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
      const result = await rest.post(
        `/api/config/script/config/${encodeURIComponent(object_id)}`,
        config,
      );
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
      await rest.delete(`/api/config/script/config/${encodeURIComponent(object_id)}`);
      return { content: [{ type: "text", text: `Script '${object_id}' deleted.` }] };
    },
  );
}

export function registerSceneTools(server: McpServer, rest: RestClient): void {
  server.registerTool(
    "ha_list_scenes",
    {
      description: "List all scenes in Home Assistant",
    },
    async () => {
      const states =
        await rest.get<
          Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
        >("/api/states");
      const scenes = states
        .filter((s) => s.entity_id.startsWith("scene."))
        .map((s) => ({
          entity_id: s.entity_id,
          state: s.state,
          name: s.attributes.friendly_name,
          id: s.attributes.id,
        }));
      return { content: [{ type: "text", text: JSON.stringify(scenes, null, 2) }] };
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
      const id = crypto.randomUUID();
      const result = await rest.post(
        `/api/config/scene/config/${encodeURIComponent(id)}`,
        config,
      );
      return {
        content: [
          {
            type: "text",
            text: `Scene created (id: ${id}).\n${JSON.stringify(result, null, 2)}`,
          },
        ],
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
      const result = await rest.post(
        `/api/config/scene/config/${encodeURIComponent(scene_id)}`,
        config,
      );
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
      await rest.delete(`/api/config/scene/config/${encodeURIComponent(scene_id)}`);
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
          results[d] = await ws.sendCommand(`${d}/list`);
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
      const result = await ws.sendCommand(`${domain}/create`, config);
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
      const result = await ws.sendCommand(`${domain}/update`, {
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
      await ws.sendCommand(`${domain}/delete`, {
        [`${domain}_id`]: helper_id,
      });
      return { content: [{ type: "text", text: `Helper '${helper_id}' (${domain}) deleted.` }] };
    },
  );
}
