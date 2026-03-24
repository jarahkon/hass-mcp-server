import { describe, it, expect, vi, beforeEach } from "vitest";
import { HaSftpClient } from "../ha/sftp-client.js";
import type { Config } from "../config.js";

// Mock the ssh2-sftp-client module
vi.mock("ssh2-sftp-client", () => {
  return {
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
  };
});

const testConfig: Config = {
  haUrl: "http://ha.local:8123",
  haToken: "test-token",
  sshHost: "192.168.1.100",
  sshPort: 22,
  sshUser: "root",
  sshPassword: "password",
};

describe("HaSftpClient path validation", () => {
  let client: HaSftpClient;

  beforeEach(() => {
    client = new HaSftpClient(testConfig);
  });

  describe("resolveSafePath — read operations", () => {
    it("allows paths under /config/", async () => {
      await expect(client.list("/config/www/")).resolves.toBeDefined();
    });

    it("allows relative paths (resolved under /config/)", async () => {
      await expect(client.list("www/")).resolves.toBeDefined();
    });

    it("rejects directory traversal with ../", async () => {
      await expect(client.list("/config/../etc/passwd")).rejects.toThrow(
        "resolves outside /config/",
      );
    });

    it("rejects double traversal attempts", async () => {
      await expect(client.list("/config/www/../../etc/shadow")).rejects.toThrow(
        "resolves outside /config/",
      );
    });

    it("rejects absolute paths outside /config/ via traversal", async () => {
      await expect(client.list("/config/../../etc/passwd")).rejects.toThrow(
        "resolves outside /config/",
      );
    });

    it("absolute paths without /config/ prefix are resolved under /config/", async () => {
      // /etc/passwd → /config/etc/passwd (safe, stays under /config/)
      await expect(client.readFile("/etc/passwd")).resolves.toBeDefined();
    });

    it("allows reading anywhere under /config/", async () => {
      await expect(client.readFile("/config/configuration.yaml")).resolves.toBeDefined();
    });
  });

  describe("assertWriteSafePath — write/delete operations", () => {
    it("allows writes to /config/www/", async () => {
      await expect(
        client.uploadBuffer("test", "/config/www/test.html"),
      ).resolves.toBeUndefined();
    });

    it("allows writes to /config/custom_components/", async () => {
      await expect(
        client.uploadBuffer("test", "/config/custom_components/my_comp/init.py"),
      ).resolves.toBeUndefined();
    });

    it("allows writes to /config/blueprints/", async () => {
      await expect(
        client.uploadBuffer("test", "/config/blueprints/automation/test.yaml"),
      ).resolves.toBeUndefined();
    });

    it("allows writes to /config/themes/", async () => {
      await expect(
        client.uploadBuffer("test", "/config/themes/my_theme.yaml"),
      ).resolves.toBeUndefined();
    });

    it("allows writes to /config/configuration.yaml", async () => {
      await expect(
        client.uploadBuffer("test", "/config/configuration.yaml"),
      ).resolves.toBeUndefined();
    });

    it("rejects writes to /config/ root", async () => {
      await expect(client.uploadBuffer("test", "/config/secrets.yaml")).rejects.toThrow(
        "Write/delete not allowed",
      );
    });

    it("rejects delete to unsafe paths", async () => {
      await expect(client.deleteFile("/config/secrets.yaml")).rejects.toThrow(
        "Write/delete not allowed",
      );
    });

    it("allows delete to safe paths", async () => {
      await expect(client.deleteFile("/config/www/old-file.html")).resolves.toBeUndefined();
    });

    it("rejects mkdir to unsafe paths", async () => {
      await expect(client.mkdir("/config/some_new_dir")).rejects.toThrow(
        "Write/delete not allowed",
      );
    });

    it("allows mkdir to safe paths", async () => {
      await expect(client.mkdir("/config/www/subdir")).resolves.toBeUndefined();
    });
  });
});
