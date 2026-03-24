# Hass MCP Server — VS Code Extension

MCP server for full Home Assistant control. AI agents (GitHub Copilot, Claude, etc.) can manage your dashboards, automations, files, apps, entities, and more — so you never have to touch HA settings yourself.

**65 tools** across 5 categories, using three HA transport layers: REST API, WebSocket API, and SSH/SFTP.

## Quick Start

1. Install this extension from the VS Code Marketplace
2. Create a long-lived access token in Home Assistant:
   - Open your Home Assistant UI
   - Click your profile icon (bottom-left)
   - Go to the **Security** tab
   - Under **Long-Lived Access Tokens**, click **Create Token** and copy it
3. When VS Code prompts you for environment variables, enter:
   - `HA_URL` — your Home Assistant URL (e.g. `http://homeassistant.local:8123`)
   - `HA_TOKEN` — the long-lived access token you just created
4. Start using Copilot Chat or any MCP-compatible AI agent to control your Home Assistant

That's it — the extension automatically downloads and runs the server via `npx`. No manual installation needed.

## Configuring SSH (Optional — for file management)

File management tools (`ha_upload_file`, `ha_read_file`, `ha_list_files`, etc.) require SSH access to your Home Assistant instance. If you don't need these tools, skip this section.

### 1. Install the SSH app in Home Assistant

1. In HA, go to **Settings → Apps → App Store**
2. Install **Advanced SSH & Web Terminal**
3. In the app configuration, set the username to `root` (required for SFTP) and enable `sftp: true`
4. Configure authentication — either set a password or add your public key to `authorized_keys`
5. Start the app

### 2. Generate an SSH key (recommended)

Key-based authentication is more secure than passwords.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/ha_ed25519 -C "ha-mcp-server"
```

Add the **public key** contents (`ha_ed25519.pub`) to the app configuration in HA:

```yaml
ssh:
  username: root
  password: ""
  authorized_keys:
    - "ssh-ed25519 AAAA...contents of ha_ed25519.pub..."
  sftp: true
```

### 3. Add SSH variables to your MCP config

Create `.vscode/mcp.json` in your workspace (or add to your User Settings) with the SSH variables. This overrides the extension's default configuration:

```json
{
  "servers": {
    "home-assistant": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp-server@latest"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_long_lived_access_token_here",
        "HA_SSH_HOST": "homeassistant.local",
        "HA_SSH_USER": "root",
        "HA_SSH_KEY_PATH": "/home/you/.ssh/ha_ed25519"
      }
    }
  }
}
```

Or if using password authentication instead of a key:

```json
{
  "servers": {
    "home-assistant": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp-server@latest"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_long_lived_access_token_here",
        "HA_SSH_HOST": "homeassistant.local",
        "HA_SSH_USER": "root",
        "HA_SSH_PASSWORD": "your_ssh_password_here"
      }
    }
  }
}
```

#### SSH key path by OS

| OS | Example `HA_SSH_KEY_PATH` |
|----|---------------------------|
| **Windows** | `C:/Users/you/.ssh/ha_ed25519` |
| **macOS** | `/Users/you/.ssh/ha_ed25519` |
| **Linux** | `/home/you/.ssh/ha_ed25519` |

## Features

### Dashboards (6 tools)
Create, update, delete Lovelace dashboards and deploy full dashboard configs.

### Files (7 tools)
Upload, read, list, and delete files on your HA instance via SFTP.

### Automations, Scripts, Scenes & Helpers (17 tools)
Full CRUD for automations, scripts, scenes, and input helpers.

### Apps & System (17 tools)
Install, start, stop, restart, and configure add-ons. System info, config validation, backups, core restart, error log.

### Entities & Services (18 tools)
Query states, call services, render templates, browse entity/device/area registries. Events, calendars, intents.

## Links

- [GitHub Repository](https://github.com/jarahkon/hass-mcp-server)
- [npm Package](https://www.npmjs.com/package/hass-mcp-server)
- [Report Issues](https://github.com/jarahkon/hass-mcp-server/issues)

## License

MIT
