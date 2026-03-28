# Home Assistant MCP Server — VS Code Extension

Control your **Home Assistant** instance directly from VS Code's Copilot Chat using the Model Context Protocol (MCP).

This extension registers the [hass-mcp-server](https://www.npmjs.com/package/@jarahkon/hass-mcp-server) as an MCP server in VS Code, giving Copilot Chat access to **66 tools** across 5 categories:

| Category | Tools | Examples |
|---|---|---|
| **Dashboards** | 6 | Create, update, delete Lovelace dashboards and deploy configs |
| **Files** | 7 | Upload, read, list, delete files on HA via SFTP |
| **Automations, Scripts, Scenes & Helpers** | 17 | Full CRUD for automations, scripts, scenes, and helpers |
| **Add-ons & System** | 17 | Add-on management, system info, backups, config validation |
| **Entities & Services** | 19 | States, services, templates, registries, events, calendars |

## Quick Start

1. **Install** this extension from the VS Code Marketplace.
2. **Set your Home Assistant URL** in Settings → `homeAssistantMcp.url` (e.g., `http://homeassistant.local:8123`).
3. **Set your access token** by running the command **"Home Assistant MCP: Set Access Token"** from the Command Palette (`Ctrl+Shift+P`).
4. The MCP server will appear in Copilot Chat automatically. Ask Copilot to control your smart home!

## Configuration

| Setting | Description | Required |
|---|---|---|
| `homeAssistantMcp.url` | Home Assistant URL | Yes |
| `homeAssistantMcp.ssh.host` | SSH host for SFTP file operations | No |
| `homeAssistantMcp.ssh.port` | SSH port (default: 22) | No |
| `homeAssistantMcp.ssh.user` | SSH username | No |
| `homeAssistantMcp.ssh.keyPath` | Path to SSH private key file | No |

## Commands

| Command | Description |
|---|---|
| **Home Assistant MCP: Set Access Token** | Securely store your HA Long-Lived Access Token |
| **Home Assistant MCP: Delete Access Token** | Remove the stored access token |
| **Home Assistant MCP: Set SSH Password** | Securely store your SSH password (for SFTP file operations) |

## How It Works

This extension is a thin wrapper that registers the `@jarahkon/hass-mcp-server` npm package as an MCP server via VS Code's `mcpServerDefinitionProviders` API. The actual MCP server runs as a child process using `npx`.

Sensitive credentials (access token, SSH password) are stored using VS Code's built-in **SecretStorage** API, ensuring they are encrypted at rest.

## Requirements

- **Node.js** ≥ 22.0.0
- **VS Code** ≥ 1.101.0
- A running **Home Assistant** instance with a [Long-Lived Access Token](https://www.home-assistant.io/docs/authentication/#your-account-profile)

## Also Available On

- **npm**: `npx @jarahkon/hass-mcp-server` — use directly with Claude Desktop, Cursor, or any MCP client
- **MCP Server Gallery**: search "Home Assistant" in VS Code's MCP server list

## License

[MIT](../LICENSE)
