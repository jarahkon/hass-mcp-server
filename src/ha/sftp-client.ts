import SftpClient from "ssh2-sftp-client";
import path from "path/posix";
import type { Config } from "../config.js";
import { requireSshConfig } from "../config.js";

const CONFIG_ROOT = "/config";
const ALLOWED_PREFIXES = ["/config/www/", "/config/custom_components/", "/config/blueprints/", "/config/themes/", "/config/scripts/", "/config/automations/"];

export class HaSftpClient {
  private config: Config;
  private sftp: SftpClient | null = null;

  constructor(config: Config) {
    this.config = config;
  }

  private resolveSafePath(remotePath: string): string {
    // Normalize and resolve the path relative to /config/
    let resolved: string;
    if (remotePath.startsWith("/config/")) {
      resolved = path.normalize(remotePath);
    } else if (remotePath.startsWith("/")) {
      resolved = path.normalize(`${CONFIG_ROOT}${remotePath}`);
    } else {
      resolved = path.normalize(`${CONFIG_ROOT}/${remotePath}`);
    }

    // Prevent directory traversal — must stay under /config/
    if (!resolved.startsWith(CONFIG_ROOT + "/") && resolved !== CONFIG_ROOT) {
      throw new Error(`Path '${remotePath}' resolves outside /config/. Access denied.`);
    }
    return resolved;
  }

  private assertWriteSafePath(resolvedPath: string): void {
    // For write/delete operations, restrict to known safe subdirectories
    const isSafe = ALLOWED_PREFIXES.some((prefix) => resolvedPath.startsWith(prefix));
    if (!isSafe) {
      throw new Error(
        `Write/delete not allowed at '${resolvedPath}'. Allowed paths: ${ALLOWED_PREFIXES.join(", ")}. ` +
        `Reading is allowed anywhere under /config/.`
      );
    }
  }

  private async getClient(): Promise<SftpClient> {
    if (this.sftp) {
      // Check if still connected by trying a simple operation
      try {
        await this.sftp.stat(CONFIG_ROOT);
        return this.sftp;
      } catch {
        this.sftp = null;
      }
    }

    const sshConfig = requireSshConfig(this.config);
    this.sftp = new SftpClient();
    await this.sftp.connect({
      host: sshConfig.sshHost,
      port: sshConfig.sshPort,
      username: sshConfig.sshUser,
      password: sshConfig.sshPassword,
    });
    return this.sftp;
  }

  async list(remotePath: string): Promise<Array<{ name: string; type: string; size: number; modifyTime: number }>> {
    const resolved = this.resolveSafePath(remotePath);
    const client = await this.getClient();
    const items = await client.list(resolved);
    return items.map((item) => ({
      name: item.name,
      type: item.type === "d" ? "directory" : "file",
      size: item.size,
      modifyTime: item.modifyTime,
    }));
  }

  async readFile(remotePath: string): Promise<string> {
    const resolved = this.resolveSafePath(remotePath);
    const client = await this.getClient();
    const buffer = await client.get(resolved);
    if (Buffer.isBuffer(buffer)) {
      return buffer.toString("utf-8");
    }
    // If it returns a stream (shouldn't happen with default options), convert it
    throw new Error("Unexpected stream response from SFTP get");
  }

  async uploadBuffer(content: string, remotePath: string): Promise<void> {
    const resolved = this.resolveSafePath(remotePath);
    this.assertWriteSafePath(resolved);
    const client = await this.getClient();

    // Ensure parent directory exists
    const parentDir = path.dirname(resolved);
    await client.mkdir(parentDir, true);

    await client.put(Buffer.from(content, "utf-8"), resolved);
  }

  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    const resolved = this.resolveSafePath(remotePath);
    this.assertWriteSafePath(resolved);
    const client = await this.getClient();

    // Ensure parent directory exists
    const parentDir = path.dirname(resolved);
    await client.mkdir(parentDir, true);

    await client.put(localPath, resolved);
  }

  async deleteFile(remotePath: string): Promise<void> {
    const resolved = this.resolveSafePath(remotePath);
    this.assertWriteSafePath(resolved);
    const client = await this.getClient();
    await client.delete(resolved);
  }

  async mkdir(remotePath: string): Promise<void> {
    const resolved = this.resolveSafePath(remotePath);
    this.assertWriteSafePath(resolved);
    const client = await this.getClient();
    await client.mkdir(resolved, true);
  }

  async exists(remotePath: string): Promise<false | "file" | "directory"> {
    const resolved = this.resolveSafePath(remotePath);
    const client = await this.getClient();
    const result = await client.exists(resolved);
    if (result === false) return false;
    if (result === "d") return "directory";
    return "file";
  }

  async disconnect(): Promise<void> {
    if (this.sftp) {
      await this.sftp.end();
      this.sftp = null;
    }
  }
}
