import type { Config } from "../config.js";

export class RestClient {
  private baseUrl: string;
  private token: string;

  constructor(config: Config) {
    this.baseUrl = config.haUrl;
    this.token = config.haToken;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.headers(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HA REST GET ${path} failed (${res.status}): ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HA REST POST ${path} failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async delete<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HA REST DELETE ${path} failed (${res.status}): ${text}`);
    }
    return res.json() as Promise<T>;
  }
}
