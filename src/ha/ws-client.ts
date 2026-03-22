import WebSocket from "ws";
import type { Config } from "../config.js";

interface PendingCommand {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WsClient {
  private ws: WebSocket | null = null;
  private config: Config;
  private msgId = 0;
  private pending = new Map<number, PendingCommand>();
  private authenticated = false;
  private connectPromise: Promise<void> | null = null;
  private commandTimeoutMs: number;

  constructor(config: Config, commandTimeoutMs = 30_000) {
    this.config = config;
    this.commandTimeoutMs = commandTimeoutMs;
  }

  async connect(): Promise<void> {
    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }
    this.connectPromise = this._connect();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.haUrl.replace(/^http/, "ws") + "/api/websocket";
      this.ws = new WebSocket(wsUrl, { rejectUnauthorized: false });
      this.authenticated = false;

      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg, resolve, reject);
      });

      this.ws.on("error", (err) => {
        if (!this.authenticated) {
          reject(new Error(`WebSocket connection failed: ${err.message}`));
        }
        this.rejectAllPending(new Error(`WebSocket error: ${err.message}`));
      });

      this.ws.on("close", () => {
        this.authenticated = false;
        this.rejectAllPending(new Error("WebSocket connection closed"));
      });
    });
  }

  private handleMessage(msg: { type: string; id?: number; success?: boolean; result?: unknown; error?: { code: string; message: string }; ha_version?: string }, resolve: () => void, reject: (err: Error) => void): void {
    switch (msg.type) {
      case "auth_required":
        this.ws!.send(JSON.stringify({ type: "auth", access_token: this.config.haToken }));
        break;

      case "auth_ok":
        this.authenticated = true;
        resolve();
        break;

      case "auth_invalid":
        reject(new Error("HA WebSocket authentication failed. Check your HA_TOKEN."));
        break;

      case "result": {
        const pending = this.pending.get(msg.id!);
        if (pending) {
          this.pending.delete(msg.id!);
          clearTimeout(pending.timer);
          if (msg.success) {
            pending.resolve(msg.result);
          } else {
            pending.reject(new Error(`HA WS error (${msg.error?.code}): ${msg.error?.message}`));
          }
        }
        break;
      }
    }
  }

  async sendCommand<T = unknown>(type: string, payload?: Record<string, unknown>): Promise<T> {
    await this.connect();
    const id = ++this.msgId;
    const msg = { id, type, ...payload };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`HA WS command '${type}' timed out after ${this.commandTimeoutMs}ms`));
      }, this.commandTimeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });

      this.ws!.send(JSON.stringify(msg));
    });
  }

  private rejectAllPending(err: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
      this.pending.delete(id);
    }
  }

  async disconnect(): Promise<void> {
    this.rejectAllPending(new Error("Client disconnecting"));
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.authenticated = false;
  }
}
