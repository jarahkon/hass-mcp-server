import { describe, it, expect, vi, beforeEach } from "vitest";
import { RestClient } from "../ha/rest-client.js";
import type { Config } from "../config.js";

const testConfig: Config = {
  haUrl: "http://ha.local:8123",
  haToken: "test-token-abc",
  sshPort: 22,
};

describe("RestClient", () => {
  let client: RestClient;

  beforeEach(() => {
    client = new RestClient(testConfig);
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("Authorization header", () => {
    it("GET includes correct Bearer token", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

      await client.get("/api/states");

      expect(fetch).toHaveBeenCalledWith("http://ha.local:8123/api/states", {
        method: "GET",
        headers: {
          Authorization: "Bearer test-token-abc",
          "Content-Type": "application/json",
        },
      });
    });

    it("POST includes correct Bearer token", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      );

      await client.post("/api/services/light/turn_on", { entity_id: "light.test" });

      expect(fetch).toHaveBeenCalledWith("http://ha.local:8123/api/services/light/turn_on", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token-abc",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entity_id: "light.test" }),
      });
    });

    it("DELETE includes correct Bearer token", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      );

      await client.delete("/api/states/sensor.test");

      expect(fetch).toHaveBeenCalledWith("http://ha.local:8123/api/states/sensor.test", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer test-token-abc",
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("Error handling", () => {
    it("GET throws on non-2xx with status and body", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Not Found", { status: 404 }),
      );

      await expect(client.get("/api/missing")).rejects.toThrow("404");
    });

    it("POST throws on non-2xx with status and body", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Unauthorized", { status: 401 }),
      );

      await expect(client.post("/api/services/test")).rejects.toThrow("401");
    });

    it("DELETE throws on non-2xx with status and body", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response("Server Error", { status: 500 }),
      );

      await expect(client.delete("/api/states/bad")).rejects.toThrow("500");
    });
  });

  describe("URL construction", () => {
    it("correctly joins base URL with path", async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 }),
      );

      await client.get("/api/config");

      expect(fetch).toHaveBeenCalledWith(
        "http://ha.local:8123/api/config",
        expect.anything(),
      );
    });
  });
});
