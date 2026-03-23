import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, requireSshConfig } from "../config.js";

describe("loadConfig", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars
    delete process.env.HA_URL;
    delete process.env.HA_TOKEN;
    delete process.env.HA_SSH_HOST;
    delete process.env.HA_SSH_PORT;
    delete process.env.HA_SSH_USER;
    delete process.env.HA_SSH_PASSWORD;
    delete process.env.HA_SSH_KEY_PATH;
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("loads valid config with all required env vars", () => {
    process.env.HA_URL = "http://homeassistant.local:8123";
    process.env.HA_TOKEN = "test-token-123";

    const config = loadConfig();
    expect(config.haUrl).toBe("http://homeassistant.local:8123");
    expect(config.haToken).toBe("test-token-123");
    expect(config.sshPort).toBe(22);
  });

  it("strips trailing slash from HA_URL", () => {
    process.env.HA_URL = "http://homeassistant.local:8123///";
    process.env.HA_TOKEN = "token";

    const config = loadConfig();
    expect(config.haUrl).toBe("http://homeassistant.local:8123");
  });

  it("throws descriptive error when HA_URL is missing", () => {
    process.env.HA_TOKEN = "token";

    expect(() => loadConfig()).toThrow("HA_URL environment variable is required");
  });

  it("throws descriptive error when HA_TOKEN is missing", () => {
    process.env.HA_URL = "http://homeassistant.local:8123";

    expect(() => loadConfig()).toThrow("HA_TOKEN environment variable is required");
  });

  it("loads optional SSH config when provided", () => {
    process.env.HA_URL = "http://homeassistant.local:8123";
    process.env.HA_TOKEN = "token";
    process.env.HA_SSH_HOST = "192.168.1.100";
    process.env.HA_SSH_PORT = "2222";
    process.env.HA_SSH_USER = "root";
    process.env.HA_SSH_PASSWORD = "secret";

    const config = loadConfig();
    expect(config.sshHost).toBe("192.168.1.100");
    expect(config.sshPort).toBe(2222);
    expect(config.sshUser).toBe("root");
    expect(config.sshPassword).toBe("secret");
  });

  it("does not error when SSH config is absent", () => {
    process.env.HA_URL = "http://homeassistant.local:8123";
    process.env.HA_TOKEN = "token";

    const config = loadConfig();
    expect(config.sshHost).toBeUndefined();
    expect(config.sshUser).toBeUndefined();
  });
});

describe("requireSshConfig", () => {
  it("throws when sshHost is missing", () => {
    const config = {
      haUrl: "http://ha.local",
      haToken: "tok",
      sshPort: 22,
      sshUser: "root",
      sshPassword: "pw",
    };
    expect(() => requireSshConfig({ ...config, sshHost: undefined })).toThrow(
      "SSH configuration",
    );
  });

  it("throws when sshUser is missing", () => {
    const config = {
      haUrl: "http://ha.local",
      haToken: "tok",
      sshPort: 22,
      sshHost: "192.168.1.1",
      sshPassword: "pw",
    };
    expect(() => requireSshConfig({ ...config, sshUser: undefined })).toThrow(
      "SSH configuration",
    );
  });

  it("throws when neither password nor key is provided", () => {
    const config = {
      haUrl: "http://ha.local",
      haToken: "tok",
      sshPort: 22,
      sshHost: "192.168.1.1",
      sshUser: "root",
    };
    expect(() => requireSshConfig(config)).toThrow("HA_SSH_PASSWORD or HA_SSH_KEY_PATH");
  });

  it("succeeds with password auth", () => {
    const config = {
      haUrl: "http://ha.local",
      haToken: "tok",
      sshPort: 22,
      sshHost: "192.168.1.1",
      sshUser: "root",
      sshPassword: "secret",
    };
    const result = requireSshConfig(config);
    expect(result.sshHost).toBe("192.168.1.1");
  });

  it("succeeds with key-based auth", () => {
    const config = {
      haUrl: "http://ha.local",
      haToken: "tok",
      sshPort: 22,
      sshHost: "192.168.1.1",
      sshUser: "root",
      sshPrivateKeyPath: "/home/user/.ssh/id_rsa",
    };
    const result = requireSshConfig(config);
    expect(result.sshPrivateKeyPath).toBe("/home/user/.ssh/id_rsa");
  });
});
