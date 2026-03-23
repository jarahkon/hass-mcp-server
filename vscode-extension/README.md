# Home Assistant MCP Server — VS Code Extension

MCP server for full Home Assistant control. AI agents (GitHub Copilot, Claude, etc.) can manage your dashboards, automations, files, apps, entities, and more — so you never have to touch HA settings yourself.

**65 tools** across 5 categories, using three HA transport layers: REST API, WebSocket API, and SSH/SFTP.

## Quick Start

1. Install this extension from the VS Code Marketplace
2. Create a long-lived access token in Home Assistant (Profile → Security → Long-Lived Access Tokens)
3. Open VS Code settings and configure the MCP server environment variables:
   - `HA_URL` — your Home Assistant URL (e.g. `http://homeassistant.local:8123`)
   - `HA_TOKEN` — the long-lived access token you just created
4. Start using Copilot Chat or any MCP-compatible AI agent to control your Home Assistant

## Configuration

The extension registers the MCP server via `npx`, so no manual installation is needed. You only need to set environment variables.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HA_URL` | Home Assistant base URL | `http://homeassistant.local:8123` |
| `HA_TOKEN` | Long-lived access token | *(from HA Profile → Security)* |

### Optional Variables (for file management)

File management tools require SSH access. Install the "Advanced SSH & Web Terminal" add-on in Home Assistant first.

| Variable | Description | Example |
|----------|-------------|---------|
| `HA_SSH_HOST` | SSH hostname | `homeassistant.local` |
| `HA_SSH_PORT` | SSH port | `22` |
| `HA_SSH_USER` | SSH username (must be `root`) | `root` |
| `HA_SSH_KEY_PATH` | Path to SSH private key | `C:/Users/you/.ssh/ha_ed25519` |
| `HA_SSH_PASSWORD` | SSH password (alternative to key) | *(your password)* |

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

- [GitHub Repository](https://github.com/jarahkon/home-assistant-mcp-server)
- [npm Package](https://www.npmjs.com/package/home-assistant-mcp-server)
- [Report Issues](https://github.com/jarahkon/home-assistant-mcp-server/issues)

## License

MIT
