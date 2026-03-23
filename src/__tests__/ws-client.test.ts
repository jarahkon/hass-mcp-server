import { describe, it, expect, vi, beforeEach } from "vitest";
import { WsClient } from "../ha/ws-client.js";
import type { Config } from "../config.js";

// Mock ws module
const mockWs = {
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  readyState: 1, // OPEN
};

vi.mock("ws", () => {
  function WebSocket() {
    return mockWs;
  }
  WebSocket.OPEN = 1;
  return { default: WebSocket };
});

const testConfig: Config = {
  haUrl: "http://ha.local:8123",
  haToken: "test-token",
  sshPort: 22,
};

/** Helper to set up the mock WS with auth and optional event capture. */
function setupAuthMock(opts?: { captureClose?: (handler: () => void) => void }) {
  mockWs.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
    if (event === "message") {
      setTimeout(() => {
        cb(JSON.stringify({ type: "auth_required" }));
        setTimeout(() => cb(JSON.stringify({ type: "auth_ok" })), 5);
      }, 5);
    }
    if (event === "close" && opts?.captureClose) {
      opts.captureClose(cb as () => void);
    }
    return mockWs;
  });
}

describe("WsClient", () => {
  let client: WsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWs.send = vi.fn();
    mockWs.close = vi.fn();
    mockWs.on = vi.fn();
    mockWs.readyState = 1;
    mockWs.on.mockImplementation(() => mockWs);
    client = new WsClient(testConfig, 500); // Short timeout for tests
  });

  it("authenticates on auth_required message", async () => {
    setupAuthMock();
    await client.connect();

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "auth", access_token: "test-token" }),
    );
  });

  it("rejects on auth_invalid message", async () => {
    mockWs.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "message") {
        setTimeout(() => {
          cb(JSON.stringify({ type: "auth_required" }));
          setTimeout(() => cb(JSON.stringify({ type: "auth_invalid" })), 10);
        }, 10);
      }
      return mockWs;
    });

    await expect(client.connect()).rejects.toThrow("authentication failed");
  });

  it("sendCommand correlates message IDs in responses", async () => {
    setupAuthMock();
    await client.connect();

    // Intercept send to capture the command and respond
    mockWs.send.mockImplementation((raw: string) => {
      const msg = JSON.parse(raw);
      if (msg.type === "lovelace/dashboards") {
        // Simulate a result response for this command ID
        const messageListener = mockWs.on.mock.calls.find(
          (c: unknown[]) => c[0] === "message",
        )?.[1] as (data: string) => void;
        setTimeout(() => {
          messageListener(
            JSON.stringify({
              type: "result",
              id: msg.id,
              success: true,
              result: [{ title: "Dashboard" }],
            }),
          );
        }, 5);
      }
    });

    const result = await client.sendCommand("lovelace/dashboards");
    expect(result).toEqual([{ title: "Dashboard" }]);
  });

  it("rejects on command timeout", async () => {
    setupAuthMock();
    await client.connect();

    // Send command but never respond — should timeout
    await expect(client.sendCommand("lovelace/dashboards")).rejects.toThrow("timed out");
  });

  it("rejects all pending commands on disconnect", async () => {
    let closeHandler: () => void;
    setupAuthMock({
      captureClose: (h) => {
        closeHandler = h;
      },
    });
    await client.connect();

    const resultPromise = client.sendCommand("lovelace/dashboards");

    // Let the async sendCommand execute the send before triggering close
    await new Promise((r) => setTimeout(r, 10));

    // Simulate connection close — should reject with "closed" before timeout
    closeHandler!();

    await expect(resultPromise).rejects.toThrow("closed");
  });
});
