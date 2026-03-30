import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RestClient } from "../ha/rest-client.js";
import type { WsClient } from "../ha/ws-client.js";
import {
  registerAutomationTools,
  registerScriptTools,
  registerSceneTools,
  registerHelperTools,
} from "../tools/automations.js";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers to capture tool handlers from registerTool calls
// ──────────────────────────────────────────────────────────────────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;

function extractTools(spy: ReturnType<typeof vi.spyOn>): Map<string, ToolHandler> {
  const tools = new Map<string, ToolHandler>();
  for (const call of spy.mock.calls as unknown[][]) {
    const name = call[0] as string;
    const handler = call[2] as ToolHandler;
    tools.set(name, handler);
  }
  return tools;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock factories
// ──────────────────────────────────────────────────────────────────────────────

function mockRest(): RestClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  } as unknown as RestClient;
}

function mockWs(): WsClient {
  return {
    sendCommand: vi.fn(),
  } as unknown as WsClient;
}

// ──────────────────────────────────────────────────────────────────────────────
// Automation tools tests
// ──────────────────────────────────────────────────────────────────────────────

describe("registerAutomationTools", () => {
  let rest: ReturnType<typeof mockRest>;
  let server: McpServer;
  let tools: Map<string, ToolHandler>;

  beforeEach(() => {
    rest = mockRest();
    server = new McpServer({ name: "test", version: "0.0.0" });
    const spy = vi.spyOn(server, "registerTool");
    registerAutomationTools(server, rest);
    tools = extractTools(spy);
  });

  describe("ha_list_automations", () => {
    it("fetches states via REST and filters by automation domain", async () => {
      vi.mocked(rest.get).mockResolvedValue([
        {
          entity_id: "automation.morning_lights",
          state: "on",
          attributes: { friendly_name: "Morning Lights", id: "abc123", last_triggered: "2026-03-30T08:00:00Z" },
        },
        {
          entity_id: "light.living_room",
          state: "on",
          attributes: { friendly_name: "Living Room" },
        },
        {
          entity_id: "automation.night_mode",
          state: "off",
          attributes: { friendly_name: "Night Mode", id: "def456", last_triggered: null },
        },
      ]);

      const handler = tools.get("ha_list_automations")!;
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(rest.get).toHaveBeenCalledWith("/api/states");
      expect(parsed).toHaveLength(2);
      expect(parsed[0].entity_id).toBe("automation.morning_lights");
      expect(parsed[0].id).toBe("abc123");
      expect(parsed[1].entity_id).toBe("automation.night_mode");
    });
  });

  describe("ha_get_automation", () => {
    it("uses REST GET with correct config endpoint", async () => {
      vi.mocked(rest.get).mockResolvedValue({ alias: "Test", trigger: [], action: [] });

      const handler = tools.get("ha_get_automation")!;
      await handler({ automation_id: "abc123" });

      expect(rest.get).toHaveBeenCalledWith("/api/config/automation/config/abc123");
    });

    it("encodes special characters in the ID", async () => {
      vi.mocked(rest.get).mockResolvedValue({});

      const handler = tools.get("ha_get_automation")!;
      await handler({ automation_id: "id with spaces" });

      expect(rest.get).toHaveBeenCalledWith("/api/config/automation/config/id%20with%20spaces");
    });
  });

  describe("ha_create_automation", () => {
    it("uses REST POST with generated UUID", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const config = { alias: "New Auto", trigger: [{ platform: "state" }], action: [] };
      const handler = tools.get("ha_create_automation")!;
      const result = await handler({ config });

      expect(rest.post).toHaveBeenCalledTimes(1);
      const [url, body] = vi.mocked(rest.post).mock.calls[0];
      expect(url).toMatch(/^\/api\/config\/automation\/config\/[0-9a-f-]{36}$/);
      expect(body).toEqual(config);
      expect(result.content[0].text).toContain("Automation created");
    });
  });

  describe("ha_update_automation", () => {
    it("uses REST POST to the correct automation endpoint", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const config = { alias: "Updated" };
      const handler = tools.get("ha_update_automation")!;
      await handler({ automation_id: "abc123", config });

      expect(rest.post).toHaveBeenCalledWith("/api/config/automation/config/abc123", config);
    });
  });

  describe("ha_delete_automation", () => {
    it("uses REST DELETE to the correct automation endpoint", async () => {
      vi.mocked(rest.delete).mockResolvedValue({ result: "ok" });

      const handler = tools.get("ha_delete_automation")!;
      await handler({ automation_id: "abc123" });

      expect(rest.delete).toHaveBeenCalledWith("/api/config/automation/config/abc123");
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Script tools tests
// ──────────────────────────────────────────────────────────────────────────────

describe("registerScriptTools", () => {
  let rest: ReturnType<typeof mockRest>;
  let server: McpServer;
  let tools: Map<string, ToolHandler>;

  beforeEach(() => {
    rest = mockRest();
    server = new McpServer({ name: "test", version: "0.0.0" });
    const spy = vi.spyOn(server, "registerTool");
    registerScriptTools(server, rest);
    tools = extractTools(spy);
  });

  describe("ha_list_scripts", () => {
    it("fetches states via REST and filters by script domain", async () => {
      vi.mocked(rest.get).mockResolvedValue([
        {
          entity_id: "script.morning_routine",
          state: "off",
          attributes: { friendly_name: "Morning Routine", last_triggered: "2026-03-30T07:00:00Z" },
        },
        {
          entity_id: "light.kitchen",
          state: "on",
          attributes: {},
        },
      ]);

      const handler = tools.get("ha_list_scripts")!;
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(rest.get).toHaveBeenCalledWith("/api/states");
      expect(parsed).toHaveLength(1);
      expect(parsed[0].entity_id).toBe("script.morning_routine");
      expect(parsed[0].object_id).toBe("morning_routine");
    });
  });

  describe("ha_create_script", () => {
    it("uses REST POST to /api/config/script/config/{object_id}", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const config = { alias: "Add Sick Leave", sequence: [{ action: "test.action" }] };
      const handler = tools.get("ha_create_script")!;
      await handler({ object_id: "add_sick_leave", config });

      expect(rest.post).toHaveBeenCalledWith(
        "/api/config/script/config/add_sick_leave",
        config,
      );
    });

    it("encodes special characters in object_id", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const handler = tools.get("ha_create_script")!;
      await handler({ object_id: "test script", config: { alias: "Test", sequence: [] } });

      expect(rest.post).toHaveBeenCalledWith(
        "/api/config/script/config/test%20script",
        expect.anything(),
      );
    });
  });

  describe("ha_update_script", () => {
    it("uses REST POST with correct endpoint", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const config = { alias: "Updated", sequence: [] };
      const handler = tools.get("ha_update_script")!;
      await handler({ object_id: "morning_routine", config });

      expect(rest.post).toHaveBeenCalledWith(
        "/api/config/script/config/morning_routine",
        config,
      );
    });
  });

  describe("ha_delete_script", () => {
    it("uses REST DELETE with correct endpoint", async () => {
      vi.mocked(rest.delete).mockResolvedValue({ result: "ok" });

      const handler = tools.get("ha_delete_script")!;
      await handler({ object_id: "morning_routine" });

      expect(rest.delete).toHaveBeenCalledWith("/api/config/script/config/morning_routine");
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Scene tools tests
// ──────────────────────────────────────────────────────────────────────────────

describe("registerSceneTools", () => {
  let rest: ReturnType<typeof mockRest>;
  let server: McpServer;
  let tools: Map<string, ToolHandler>;

  beforeEach(() => {
    rest = mockRest();
    server = new McpServer({ name: "test", version: "0.0.0" });
    const spy = vi.spyOn(server, "registerTool");
    registerSceneTools(server, rest);
    tools = extractTools(spy);
  });

  describe("ha_list_scenes", () => {
    it("fetches states via REST and filters by scene domain", async () => {
      vi.mocked(rest.get).mockResolvedValue([
        {
          entity_id: "scene.movie_night",
          state: "scening",
          attributes: { friendly_name: "Movie Night", id: "scene-001" },
        },
        {
          entity_id: "switch.tv",
          state: "off",
          attributes: {},
        },
      ]);

      const handler = tools.get("ha_list_scenes")!;
      const result = await handler({});
      const parsed = JSON.parse(result.content[0].text);

      expect(rest.get).toHaveBeenCalledWith("/api/states");
      expect(parsed).toHaveLength(1);
      expect(parsed[0].entity_id).toBe("scene.movie_night");
      expect(parsed[0].id).toBe("scene-001");
    });
  });

  describe("ha_create_scene", () => {
    it("uses REST POST with generated UUID", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const config = { name: "Relax", entities: { "light.living_room": { state: "on", brightness: 100 } } };
      const handler = tools.get("ha_create_scene")!;
      const result = await handler({ config });

      expect(rest.post).toHaveBeenCalledTimes(1);
      const [url, body] = vi.mocked(rest.post).mock.calls[0];
      expect(url).toMatch(/^\/api\/config\/scene\/config\/[0-9a-f-]{36}$/);
      expect(body).toEqual(config);
      expect(result.content[0].text).toContain("Scene created");
    });
  });

  describe("ha_update_scene", () => {
    it("uses REST POST to the correct scene endpoint", async () => {
      vi.mocked(rest.post).mockResolvedValue({ result: "ok" });

      const config = { name: "Updated Scene" };
      const handler = tools.get("ha_update_scene")!;
      await handler({ scene_id: "scene-001", config });

      expect(rest.post).toHaveBeenCalledWith("/api/config/scene/config/scene-001", config);
    });
  });

  describe("ha_delete_scene", () => {
    it("uses REST DELETE to the correct scene endpoint", async () => {
      vi.mocked(rest.delete).mockResolvedValue({ result: "ok" });

      const handler = tools.get("ha_delete_scene")!;
      await handler({ scene_id: "scene-001" });

      expect(rest.delete).toHaveBeenCalledWith("/api/config/scene/config/scene-001");
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper tools tests
// ──────────────────────────────────────────────────────────────────────────────

describe("registerHelperTools", () => {
  let ws: ReturnType<typeof mockWs>;
  let server: McpServer;
  let tools: Map<string, ToolHandler>;

  beforeEach(() => {
    ws = mockWs();
    server = new McpServer({ name: "test", version: "0.0.0" });
    const spy = vi.spyOn(server, "registerTool");
    registerHelperTools(server, ws);
    tools = extractTools(spy);
  });

  describe("ha_list_helpers", () => {
    it("uses '{domain}/list' WS command (NOT 'config/{domain}/list')", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue([]);

      const handler = tools.get("ha_list_helpers")!;
      await handler({ domain: "input_boolean" });

      expect(ws.sendCommand).toHaveBeenCalledWith("input_boolean/list");
    });

    it("lists all helper domains when no domain specified", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue([]);

      const handler = tools.get("ha_list_helpers")!;
      await handler({});

      const calls = vi.mocked(ws.sendCommand).mock.calls.map((c) => c[0]);
      expect(calls).toContain("input_boolean/list");
      expect(calls).toContain("input_number/list");
      expect(calls).toContain("input_text/list");
      expect(calls).toContain("input_select/list");
      expect(calls).toContain("input_datetime/list");
      expect(calls).toContain("input_button/list");
      expect(calls).toContain("counter/list");
      expect(calls).toContain("timer/list");
      expect(calls).toHaveLength(8);
    });

    it("does NOT send config/ prefix WS commands", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue([]);

      const handler = tools.get("ha_list_helpers")!;
      await handler({});

      for (const call of vi.mocked(ws.sendCommand).mock.calls) {
        expect(call[0]).not.toMatch(/^config\//);
      }
    });
  });

  describe("ha_create_helper", () => {
    it("uses '{domain}/create' WS command with config payload", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue({ id: "new-helper" });

      const config = { name: "PTO Start Date", has_date: true, has_time: false, icon: "mdi:calendar-start" };
      const handler = tools.get("ha_create_helper")!;
      await handler({ domain: "input_datetime", config });

      expect(ws.sendCommand).toHaveBeenCalledWith("input_datetime/create", config);
    });

    it("does NOT use 'config/input_datetime/create'", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue({});

      const handler = tools.get("ha_create_helper")!;
      await handler({ domain: "input_datetime", config: { name: "Test" } });

      expect(ws.sendCommand).not.toHaveBeenCalledWith(
        expect.stringContaining("config/"),
        expect.anything(),
      );
    });

    it("works for all helper domains", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue({ id: "test" });

      const handler = tools.get("ha_create_helper")!;
      const domains = [
        "input_boolean", "input_number", "input_text", "input_select",
        "input_datetime", "input_button", "counter", "timer",
      ];

      for (const domain of domains) {
        vi.mocked(ws.sendCommand).mockClear();
        await handler({ domain, config: { name: "Test" } });
        expect(ws.sendCommand).toHaveBeenCalledWith(`${domain}/create`, { name: "Test" });
      }
    });
  });

  describe("ha_update_helper", () => {
    it("uses '{domain}/update' WS command with domain_id key", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue({});

      const handler = tools.get("ha_update_helper")!;
      await handler({ domain: "input_boolean", helper_id: "my_bool", config: { name: "Updated" } });

      expect(ws.sendCommand).toHaveBeenCalledWith("input_boolean/update", {
        input_boolean_id: "my_bool",
        name: "Updated",
      });
    });

    it("uses correct item_id_key for different domains", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue({});

      const handler = tools.get("ha_update_helper")!;
      await handler({ domain: "counter", helper_id: "my_counter", config: { name: "New Name" } });

      expect(ws.sendCommand).toHaveBeenCalledWith("counter/update", {
        counter_id: "my_counter",
        name: "New Name",
      });
    });
  });

  describe("ha_delete_helper", () => {
    it("uses '{domain}/delete' WS command with domain_id key", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue(undefined);

      const handler = tools.get("ha_delete_helper")!;
      await handler({ domain: "input_datetime", helper_id: "pto_start" });

      expect(ws.sendCommand).toHaveBeenCalledWith("input_datetime/delete", {
        input_datetime_id: "pto_start",
      });
    });

    it("does NOT use 'config/' prefix", async () => {
      vi.mocked(ws.sendCommand).mockResolvedValue(undefined);

      const handler = tools.get("ha_delete_helper")!;
      await handler({ domain: "timer", helper_id: "my_timer" });

      expect(ws.sendCommand).not.toHaveBeenCalledWith(
        expect.stringContaining("config/"),
        expect.anything(),
      );
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SFTP allowed paths tests for new YAML files
// ──────────────────────────────────────────────────────────────────────────────

describe("SFTP YAML config file access", () => {
  // Re-import to test the updated allowed files list
  let sftp: import("../ha/sftp-client.js").HaSftpClient;

  beforeEach(async () => {
    vi.resetModules();

    // Re-mock ssh2-sftp-client
    vi.doMock("ssh2-sftp-client", () => ({
      default: function MockSftp() {
        return {
          connect: vi.fn(),
          stat: vi.fn().mockResolvedValue({}),
          list: vi.fn().mockResolvedValue([]),
          get: vi.fn().mockResolvedValue(Buffer.from("content")),
          put: vi.fn(),
          delete: vi.fn(),
          mkdir: vi.fn(),
          exists: vi.fn().mockResolvedValue(false),
          end: vi.fn(),
        };
      },
    }));

    const { HaSftpClient } = await import("../ha/sftp-client.js");
    sftp = new HaSftpClient({
      haUrl: "http://ha.local:8123",
      haToken: "test",
      sshHost: "192.168.1.100",
      sshPort: 22,
      sshUser: "root",
      sshPassword: "password",
    });
  });

  it("allows writing to /config/scripts.yaml", async () => {
    await expect(sftp.uploadBuffer("test: true", "scripts.yaml")).resolves.toBeUndefined();
  });

  it("allows writing to /config/automations.yaml", async () => {
    await expect(sftp.uploadBuffer("test: true", "automations.yaml")).resolves.toBeUndefined();
  });

  it("allows writing to /config/scenes.yaml", async () => {
    await expect(sftp.uploadBuffer("test: true", "scenes.yaml")).resolves.toBeUndefined();
  });

  it("allows writing to /config/scripts/ directory", async () => {
    await expect(sftp.uploadBuffer("test", "scripts/my_script.yaml")).resolves.toBeUndefined();
  });

  it("allows writing to /config/automations/ directory", async () => {
    await expect(sftp.uploadBuffer("test", "automations/my_auto.yaml")).resolves.toBeUndefined();
  });

  it("still rejects writes to unsafe paths", async () => {
    await expect(sftp.uploadBuffer("test", "secrets.yaml")).rejects.toThrow("Write/delete not allowed");
  });
});
