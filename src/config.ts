export interface Config {
  haUrl: string;
  haToken: string;
  sshHost?: string;
  sshPort: number;
  sshUser?: string;
  sshPassword?: string;
}

export function loadConfig(): Config {
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;

  if (!haUrl) {
    throw new Error("HA_URL environment variable is required (e.g. http://homeassistant.local:8123)");
  }
  if (!haToken) {
    throw new Error("HA_TOKEN environment variable is required (long-lived access token from HA Profile → Security)");
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
  };
}

export function requireSshConfig(config: Config): Required<Pick<Config, "sshHost" | "sshUser" | "sshPassword">> & Config {
  if (!config.sshHost || !config.sshUser || !config.sshPassword) {
    throw new Error(
      "File management tools require SSH configuration. Set HA_SSH_HOST, HA_SSH_USER, and HA_SSH_PASSWORD environment variables. " +
      "Install the 'Advanced SSH & Web Terminal' add-on in Home Assistant first."
    );
  }
  return config as Required<Pick<Config, "sshHost" | "sshUser" | "sshPassword">> & Config;
}
