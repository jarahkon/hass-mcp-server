import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RestClient } from "../ha/rest-client.js";
import type { WsClient } from "../ha/ws-client.js";

export function registerEntityTools(server: McpServer, rest: RestClient, ws: WsClient): void {
  server.registerTool(
    "ha_get_states",
    {
      description: "Get the current state of all entities, optionally filtered by domain (e.g. 'light', 'switch', 'sensor')",
      inputSchema: {
        domain: z.string().optional().describe("Filter by entity domain (e.g. 'light', 'sensor', 'automation'). Omit for all entities."),
      },
    },
    async ({ domain }) => {
      const states = await rest.get<Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>>("/api/states");
      const filtered = domain ? states.filter((s) => s.entity_id.startsWith(`${domain}.`)) : states;
      const compact = filtered.map((s) => ({
        entity_id: s.entity_id,
        state: s.state,
        friendly_name: s.attributes.friendly_name,
      }));
      return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
    }
  );

  server.registerTool(
    "ha_get_entity",
    {
      description: "Get the full state and attributes of a specific entity",
      inputSchema: {
        entity_id: z.string().describe("Entity ID (e.g. 'light.living_room', 'sensor.temperature')"),
      },
    },
    async ({ entity_id }) => {
      const result = await rest.get(`/api/states/${encodeURIComponent(entity_id)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "ha_call_service",
    {
      description: "Call a Home Assistant service (e.g. turn on a light, lock a door, send a notification)",
      inputSchema: {
        domain: z.string().describe("Service domain (e.g. 'light', 'switch', 'notify', 'automation')"),
        service: z.string().describe("Service name (e.g. 'turn_on', 'turn_off', 'toggle', 'trigger')"),
        data: z.record(z.unknown()).optional().describe("Service data (e.g. {brightness: 255, color_name: 'blue'})"),
        target: z.record(z.unknown()).optional().describe("Target entities/areas/devices. Example: {entity_id: 'light.living_room'} or {area_id: 'living_room'}"),
      },
    },
    async ({ domain, service, data, target }) => {
      const body: Record<string, unknown> = {};
      if (data) Object.assign(body, data);
      if (target) body.target = target;
      const result = await rest.post(`/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`, body);
      return { content: [{ type: "text", text: `Service ${domain}.${service} called.\n${JSON.stringify(result, null, 2)}` }] };
    }
  );

  server.registerTool(
    "ha_list_services",
    {
      description: "List all available services, optionally filtered by domain",
      inputSchema: {
        domain: z.string().optional().describe("Filter by domain (e.g. 'light'). Omit for all domains."),
      },
    },
    async ({ domain }) => {
      const services = await rest.get<Array<{ domain: string; services: Record<string, unknown> }>>("/api/services");
      const filtered = domain ? services.filter((s) => s.domain === domain) : services;
      return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
    }
  );

  server.registerTool(
    "ha_render_template",
    {
      description: "Render a Jinja2 template using Home Assistant's template engine",
      inputSchema: {
        template: z.string().describe("Jinja2 template string. Example: '{{ states(\"sensor.temperature\") }}'"),
      },
    },
    async ({ template }) => {
      const result = await rest.post<string>("/api/template", { template });
      return { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }] };
    }
  );

  server.registerTool(
    "ha_list_entity_registry",
    {
      description: "List all entities from the entity registry with their IDs, names, platforms, and areas",
      inputSchema: {
        domain: z.string().optional().describe("Filter by domain (e.g. 'light')"),
      },
    },
    async ({ domain }) => {
      const result = await ws.sendCommand<Array<{ entity_id: string; name: string | null; platform: string; area_id: string | null; disabled_by: string | null }>>("config/entity_registry/list");
      const filtered = domain
        ? (result as Array<{ entity_id: string }>).filter((e) => e.entity_id.startsWith(`${domain}.`))
        : result;
      return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
    }
  );

  server.registerTool(
    "ha_list_devices",
    {
      description: "List all devices from the device registry",
    },
    async () => {
      const result = await ws.sendCommand("config/device_registry/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "ha_list_areas",
    {
      description: "List all areas (rooms) in Home Assistant",
    },
    async () => {
      const result = await ws.sendCommand("config/area_registry/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.registerTool(
    "ha_create_area",
    {
      description: "Create a new area (room) in Home Assistant",
      inputSchema: {
        name: z.string().describe("Area name (e.g. 'Living Room')"),
        icon: z.string().optional().describe("Material Design icon (e.g. 'mdi:sofa')"),
      },
    },
    async ({ name, icon }) => {
      const payload: Record<string, unknown> = { name };
      if (icon) payload.icon = icon;
      const result = await ws.sendCommand("config/area_registry/create", payload);
      return { content: [{ type: "text", text: `Area created.\n${JSON.stringify(result, null, 2)}` }] };
    }
  );

  server.registerTool(
    "ha_get_history",
    {
      description: "Get the state history for an entity over a time period",
      inputSchema: {
        entity_id: z.string().describe("Entity ID to get history for"),
        start_time: z.string().optional().describe("ISO 8601 start time (e.g. '2025-01-01T00:00:00Z'). Defaults to 1 day ago."),
        end_time: z.string().optional().describe("ISO 8601 end time. Defaults to now."),
      },
    },
    async ({ entity_id, start_time, end_time }) => {
      const start = start_time || new Date(Date.now() - 86400000).toISOString();
      let path = `/api/history/period/${encodeURIComponent(start)}?filter_entity_id=${encodeURIComponent(entity_id)}`;
      if (end_time) path += `&end_time=${encodeURIComponent(end_time)}`;
      const result = await rest.get(path);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
