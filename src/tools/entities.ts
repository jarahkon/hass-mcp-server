import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { RestClient } from "../ha/rest-client.js";
import type { WsClient } from "../ha/ws-client.js";

export function registerEntityTools(server: McpServer, rest: RestClient, ws: WsClient): void {
  server.registerTool(
    "ha_get_states",
    {
      description:
        "Get the current state of all entities, optionally filtered by domain (e.g. 'light', 'switch', 'sensor')",
      inputSchema: {
        domain: z
          .string()
          .optional()
          .describe(
            "Filter by entity domain (e.g. 'light', 'sensor', 'automation'). Omit for all entities.",
          ),
      },
    },
    async ({ domain }) => {
      const states =
        await rest.get<
          Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
        >("/api/states");
      const filtered = domain ? states.filter((s) => s.entity_id.startsWith(`${domain}.`)) : states;
      const compact = filtered.map((s) => ({
        entity_id: s.entity_id,
        state: s.state,
        friendly_name: s.attributes.friendly_name,
      }));
      return { content: [{ type: "text", text: JSON.stringify(compact, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_entity",
    {
      description: "Get the full state and attributes of a specific entity",
      inputSchema: {
        entity_id: z
          .string()
          .describe("Entity ID (e.g. 'light.living_room', 'sensor.temperature')"),
      },
    },
    async ({ entity_id }) => {
      const result = await rest.get(`/api/states/${encodeURIComponent(entity_id)}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_call_service",
    {
      description:
        "Call a Home Assistant service (e.g. turn on a light, lock a door, send a notification)",
      inputSchema: {
        domain: z
          .string()
          .describe("Service domain (e.g. 'light', 'switch', 'notify', 'automation')"),
        service: z
          .string()
          .describe("Service name (e.g. 'turn_on', 'turn_off', 'toggle', 'trigger')"),
        data: z
          .record(z.unknown())
          .optional()
          .describe("Service data (e.g. {brightness: 255, color_name: 'blue'})"),
        target: z
          .record(z.unknown())
          .optional()
          .describe(
            "Target entities/areas/devices. Example: {entity_id: 'light.living_room'} or {area_id: 'living_room'}",
          ),
      },
    },
    async ({ domain, service, data, target }) => {
      const body: Record<string, unknown> = {};
      if (data) Object.assign(body, data);
      if (target) body.target = target;
      const result = await rest.post(
        `/api/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
        body,
      );
      return {
        content: [
          {
            type: "text",
            text: `Service ${domain}.${service} called.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_list_services",
    {
      description: "List all available services, optionally filtered by domain",
      inputSchema: {
        domain: z
          .string()
          .optional()
          .describe("Filter by domain (e.g. 'light'). Omit for all domains."),
      },
    },
    async ({ domain }) => {
      const services =
        await rest.get<Array<{ domain: string; services: Record<string, unknown> }>>(
          "/api/services",
        );
      const filtered = domain ? services.filter((s) => s.domain === domain) : services;
      return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_render_template",
    {
      description: "Render a Jinja2 template using Home Assistant's template engine",
      inputSchema: {
        template: z
          .string()
          .describe("Jinja2 template string. Example: '{{ states(\"sensor.temperature\") }}'"),
      },
    },
    async ({ template }) => {
      const result = await rest.post<string>("/api/template", { template });
      return {
        content: [
          { type: "text", text: typeof result === "string" ? result : JSON.stringify(result) },
        ],
      };
    },
  );

  server.registerTool(
    "ha_list_entity_registry",
    {
      description:
        "List all entities from the entity registry with their IDs, names, platforms, and areas",
      inputSchema: {
        domain: z.string().optional().describe("Filter by domain (e.g. 'light')"),
      },
    },
    async ({ domain }) => {
      const result = await ws.sendCommand<
        Array<{
          entity_id: string;
          name: string | null;
          platform: string;
          area_id: string | null;
          disabled_by: string | null;
        }>
      >("config/entity_registry/list");
      const filtered = domain
        ? (result as Array<{ entity_id: string }>).filter((e) =>
            e.entity_id.startsWith(`${domain}.`),
          )
        : result;
      return { content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_list_devices",
    {
      description: "List all devices from the device registry",
    },
    async () => {
      const result = await ws.sendCommand("config/device_registry/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_list_areas",
    {
      description: "List all areas (rooms) in Home Assistant",
    },
    async () => {
      const result = await ws.sendCommand("config/area_registry/list");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
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
      return {
        content: [{ type: "text", text: `Area created.\n${JSON.stringify(result, null, 2)}` }],
      };
    },
  );

  server.registerTool(
    "ha_get_history",
    {
      description: "Get the state history for an entity over a time period",
      inputSchema: {
        entity_id: z.string().describe("Entity ID to get history for"),
        start_time: z
          .string()
          .optional()
          .describe("ISO 8601 start time (e.g. '2025-01-01T00:00:00Z'). Defaults to 1 day ago."),
        end_time: z.string().optional().describe("ISO 8601 end time. Defaults to now."),
      },
    },
    async ({ entity_id, start_time, end_time }) => {
      const start = start_time || new Date(Date.now() - 86400000).toISOString();
      let path = `/api/history/period/${encodeURIComponent(start)}?filter_entity_id=${encodeURIComponent(entity_id)}`;
      if (end_time) path += `&end_time=${encodeURIComponent(end_time)}`;
      const result = await rest.get(path);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_logbook",
    {
      description:
        "Get logbook entries (activity log) for a time period, optionally filtered by entity",
      inputSchema: {
        entity_id: z.string().optional().describe("Filter by entity ID. Omit for all entries."),
        start_time: z.string().optional().describe("ISO 8601 start time. Defaults to 1 day ago."),
        end_time: z.string().optional().describe("ISO 8601 end time. Defaults to now."),
      },
    },
    async ({ entity_id, start_time, end_time }) => {
      const start = start_time || new Date(Date.now() - 86400000).toISOString();
      let path = `/api/logbook/${encodeURIComponent(start)}`;
      const params: string[] = [];
      if (entity_id) params.push(`entity=${encodeURIComponent(entity_id)}`);
      if (end_time) params.push(`end_time=${encodeURIComponent(end_time)}`);
      if (params.length) path += `?${params.join("&")}`;
      const result = await rest.get(path);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_events",
    {
      description: "List all available event types in Home Assistant",
    },
    async () => {
      const result = await rest.get("/api/events");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_fire_event",
    {
      description: "Fire a custom event in Home Assistant to trigger automations or integrations",
      inputSchema: {
        event_type: z
          .string()
          .describe("Event type to fire (e.g. 'custom_event', 'guest_arrived')"),
        event_data: z.record(z.unknown()).optional().describe("Optional event data payload"),
      },
    },
    async ({ event_type, event_data }) => {
      const result = await rest.post(
        `/api/events/${encodeURIComponent(event_type)}`,
        event_data ?? {},
      );
      return {
        content: [
          {
            type: "text",
            text: `Event '${event_type}' fired.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_set_state",
    {
      description:
        "Set or create the state of an entity. Useful for creating virtual sensors or overriding states.",
      inputSchema: {
        entity_id: z.string().describe("Entity ID to set (e.g. 'sensor.my_custom_sensor')"),
        state: z.string().describe("The state value to set"),
        attributes: z
          .record(z.unknown())
          .optional()
          .describe("Optional attributes to set on the entity"),
      },
    },
    async ({ entity_id, state, attributes }) => {
      const body: Record<string, unknown> = { state };
      if (attributes) body.attributes = attributes;
      const result = await rest.post(`/api/states/${encodeURIComponent(entity_id)}`, body);
      return {
        content: [
          {
            type: "text",
            text: `State set for '${entity_id}'.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "ha_delete_state",
    {
      description: "Delete an entity state from Home Assistant",
      inputSchema: {
        entity_id: z.string().describe("Entity ID to delete"),
      },
    },
    async ({ entity_id }) => {
      await rest.delete(`/api/states/${encodeURIComponent(entity_id)}`);
      return { content: [{ type: "text", text: `State for '${entity_id}' deleted.` }] };
    },
  );

  server.registerTool(
    "ha_get_calendars",
    {
      description: "List all calendar entities in Home Assistant",
    },
    async () => {
      const result = await rest.get("/api/calendars");
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_get_calendar_events",
    {
      description: "Get events from a specific calendar entity",
      inputSchema: {
        entity_id: z.string().describe("Calendar entity ID (e.g. 'calendar.my_calendar')"),
        start: z.string().optional().describe("ISO 8601 start time. Defaults to now."),
        end: z.string().optional().describe("ISO 8601 end time. Defaults to 7 days from now."),
      },
    },
    async ({ entity_id, start, end }) => {
      const startTime = start || new Date().toISOString();
      const endTime = end || new Date(Date.now() + 7 * 86400000).toISOString();
      const result = await rest.get(
        `/api/calendars/${encodeURIComponent(entity_id)}?start=${encodeURIComponent(startTime)}&end=${encodeURIComponent(endTime)}`,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "ha_handle_intent",
    {
      description:
        "Handle a conversation/voice intent in Home Assistant (e.g. natural language commands)",
      inputSchema: {
        name: z.string().describe("Intent name (e.g. 'HassLightSet', 'HassTurnOn')"),
        data: z.record(z.unknown()).optional().describe("Intent data/slots"),
      },
    },
    async ({ name, data }) => {
      const body: Record<string, unknown> = { name };
      if (data) body.data = data;
      const result = await rest.post("/api/intent/handle", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
