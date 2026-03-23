export interface Config {
  haUrl: string;
  haToken: string;
  sshHost?: string;
  sshPort: number;
  sshUser?: string;
  sshPassword?: string;
  sshPrivateKeyPath?: string;
}

export function loadConfig(): Config {
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl) {
    throw new Error(
      "HA_URL environment variable is required (e.g. http://homeassistant.local:8123)",
    );
  }
  if (!haToken) {
    throw new Error(
      "HA_TOKEN environment variable is required (long-lived access token from HA Profile → Security)",
    );
  }

  // Strip trailing slash from URL
  const normalizedUrl = haUrl.replace(/\/+$/, "");

  return {
    haUrl: normalizedUrl,
    haToken,
    sshHost: process.env.HA_SSH_HOST,
    sshPort: parseInt(process.env.HA_SSH_PORT || "22", 10),
    sshUser: process.env.HA_SSH_USER,
    sshPassword: process.env.HA_SSH_PASSWORD,
    sshPrivateKeyPath: process.env.HA_SSH_KEY_PATH,
  };
}

export type SshConfig = Required<Pick<Config, "sshHost" | "sshUser">> &
  Config &
  ({ sshPassword: string } | { sshPrivateKeyPath: string });

export function requireSshConfig(config: Config): SshConfig {
  if (!config.sshHost || !config.sshUser) {
    throw new Error(
      "File management tools require SSH configuration. Set HA_SSH_HOST and HA_SSH_USER environment variables. " +
        "Install the 'Advanced SSH & Web Terminal' add-on in Home Assistant first.",
    );
  }
  if (!config.sshPassword && !config.sshPrivateKeyPath) {
    throw new Error(
      "SSH authentication requires either HA_SSH_PASSWORD or HA_SSH_KEY_PATH. " +
        "Key-based auth (HA_SSH_KEY_PATH) is recommended for security.",
    );
  }
  return config as SshConfig;
}
