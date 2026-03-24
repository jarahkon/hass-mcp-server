# hass-mcp-server

[![npm version](https://img.shields.io/npm/v/hass-mcp-server)](https://www.npmjs.com/package/hass-mcp-server)
[![CI](https://github.com/jarahkon/hass-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/jarahkon/hass-mcp-server/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

MCP server for full Home Assistant control. AI agents (GitHub Copilot, Claude, etc.) can manage your dashboards, automations, files, apps, entities, and more — so you never have to touch HA settings yourself.

## Features

- **Dashboard management** — Create, update, delete Lovelace dashboards and deploy full dashboard configs
- **File management** — Upload, read, list, and delete files on your HA instance via SFTP (e.g. custom cards, images, HTML files)
- **Automations, scripts, scenes** — Full CRUD for automations, scripts, and scenes
- **Input helpers** — Create and manage input_boolean, input_number, input_text, input_select, input_datetime, input_button, counter, and timer helpers
- **App management** — Install, start, stop, restart, uninstall, and configure apps (add-ons)
- **Entity & service control** — Query states, call services, render templates, browse entity/device/area registries
- **System tools** — System info, config validation, backups, core restart, error log
- **Event & calendar tools** — List event types, fire events, calendar queries
- **State management** — Set, delete entity states; handle intents

**66 tools** across 5 categories, using three HA transport layers: REST API, WebSocket API, and SSH/SFTP.

## Prerequisites

- **Home Assistant OS** (or any HA installation with Supervisor)
- **Long-lived access token** — Create one in HA → Profile → Security → Long-Lived Access Tokens
- **Node.js 20+**
- **(Optional) SSH app** — Required only for file management tools. Install "Advanced SSH & Web Terminal" from the app store.

## Quick Start

No installation needed — your MCP client runs the server automatically via `npx`. Just add the configuration to your client and you're ready to go.

## Configuration

The server is configured through **environment variables** set in your MCP client's configuration file. The client injects these into the server process at launch time — you never need to set system-wide environment variables.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HA_URL` | Home Assistant base URL | `http://homeassistant.local:8123` |
| `HA_TOKEN` | Long-lived access token | *(from HA Profile → Security)* |

### Optional Variables (for file management)

File management tools require SSH access. See [Setting Up SSH](#setting-up-ssh-for-file-management) below.

| Variable | Description | Example |
|----------|-------------|---------|
| `HA_SSH_HOST` | SSH hostname | `homeassistant.local` |
| `HA_SSH_PORT` | SSH port (default: `22`) | `22` |
| `HA_SSH_USER` | SSH username (must be `root`) | `root` |
| `HA_SSH_KEY_PATH` | Path to SSH private key | See [examples per OS](#ssh-key-path-examples) |
| `HA_SSH_PASSWORD` | SSH password (alternative to key) | *(your password)* |

### Getting a Long-Lived Access Token

1. Open your Home Assistant UI
2. Click your profile icon (bottom-left)
3. Scroll to **Long-Lived Access Tokens** under the Security tab
4. Click **Create Token**, give it a name, and copy the token

## MCP Client Setup

Choose the setup for your MCP client below. In each case, add the configuration and the client will automatically download and run the server via `npx`.

> **Tip:** You can omit the `HA_SSH_*` variables if you don't need file management tools. The server will start without SFTP and only fail if you try to use a file tool.

### VS Code (GitHub Copilot)

Create `.vscode/mcp.json` in your workspace (or add to your User Settings for global access):

```json
{
  "servers": {
    "home-assistant": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hass-mcp-server@latest"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_long_lived_access_token_here"
      }
    }
  }
}
```

With SSH (for file management tools):

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

### Claude Desktop

Edit the Claude Desktop config file:

| OS | Config file path |
|----|------------------|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "home-assistant": {
      "command": "npx",
      "args": ["-y", "hass-mcp-server@latest"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_long_lived_access_token_here"
      }
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "home-assistant": {
      "command": "npx",
      "args": ["-y", "hass-mcp-server@latest"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_long_lived_access_token_here"
      }
    }
  }
}
```

### Other MCP Clients

Any MCP client that supports stdio servers will work. Use `npx` as the command with `-y hass-mcp-server@latest` as args, and pass `HA_URL` and `HA_TOKEN` in the `env` block.

## Setting Up SSH (for file management)

File management tools (`ha_upload_file`, `ha_read_file`, `ha_list_files`, etc.) require SSH access to your Home Assistant instance.

### 1. Install the SSH app in Home Assistant

1. In HA, go to **Settings → Apps → App Store**
2. Install **Advanced SSH & Web Terminal**
3. In the app configuration, set the username to `root` (required for SFTP) and enable `sftp: true`
4. Configure authentication — either set a password or add your public key to `authorized_keys` (recommended)
5. Start the app and check the logs to confirm it started successfully

### 2. Generate an SSH key (recommended)

Key-based authentication is more secure than passwords.

```bash
# Generate a key pair (leave passphrase empty for automated use)
ssh-keygen -t ed25519 -f ~/.ssh/ha_ed25519 -C "ha-mcp-server"
```

This creates `~/.ssh/ha_ed25519` (private key) and `~/.ssh/ha_ed25519.pub` (public key).

Add the **public key** contents to the app configuration in HA:

```yaml
ssh:
  username: root
  password: ""
  authorized_keys:
    - "ssh-ed25519 AAAA...contents of ha_ed25519.pub..."
  sftp: true
```

### 3. Add SSH variables to your MCP client config

Add these environment variables alongside `HA_URL` and `HA_TOKEN` in the `env` block of your MCP client configuration:

```json
"HA_SSH_HOST": "homeassistant.local",
"HA_SSH_USER": "root",
"HA_SSH_KEY_PATH": "/home/you/.ssh/ha_ed25519"
```

Or if using password authentication:

```json
"HA_SSH_HOST": "homeassistant.local",
"HA_SSH_USER": "root",
"HA_SSH_PASSWORD": "your_ssh_password_here"
```

#### SSH key path examples

| OS | Example `HA_SSH_KEY_PATH` |
|----|---------------------------|
| **Windows** | `C:/Users/you/.ssh/ha_ed25519` |
| **macOS** | `/Users/you/.ssh/ha_ed25519` |
| **Linux** | `/home/you/.ssh/ha_ed25519` |

## Tool Reference

### Dashboards (6 tools)

| Tool | Description |
|------|-------------|
| `ha_list_dashboards` | List all Lovelace dashboards |
| `ha_create_dashboard` | Create a new dashboard with url_path, title, icon |
| `ha_update_dashboard` | Update dashboard properties (title, icon, sidebar visibility) |
| `ha_delete_dashboard` | Delete a dashboard by ID |
| `ha_get_dashboard_config` | Get the full Lovelace config JSON for a dashboard |
| `ha_save_dashboard_config` | Deploy a complete Lovelace config to a dashboard |

### Files (7 tools) — requires SSH

| Tool | Description |
|------|-------------|
| `ha_list_files` | List files in a directory on HA (relative to `/config/`) |
| `ha_read_file` | Read file contents from HA |
| `ha_upload_file` | Upload a local file to HA via SFTP |
| `ha_upload_file_content` | Write string content directly to a file on HA |
| `ha_delete_file` | Delete a file on HA (restricted to safe directories) |
| `ha_mkdir` | Create a directory on HA |
| `ha_file_exists` | Check if a file or directory exists on HA |

### Automations, Scripts, Scenes & Helpers (17 tools)

| Tool | Description |
|------|-------------|
| `ha_list_automations` | List all automations |
| `ha_get_automation` | Get a specific automation's config by ID |
| `ha_create_automation` | Create a new automation |
| `ha_update_automation` | Update an existing automation |
| `ha_delete_automation` | Delete an automation |
| `ha_list_scripts` | List all scripts |
| `ha_create_script` | Create a new script |
| `ha_update_script` | Update an existing script |
| `ha_delete_script` | Delete a script |
| `ha_list_scenes` | List all scenes |
| `ha_create_scene` | Create a new scene |
| `ha_update_scene` | Update an existing scene |
| `ha_delete_scene` | Delete a scene |
| `ha_list_helpers` | List all input helpers (booleans, numbers, etc.) |
| `ha_create_helper` | Create an input helper of any type |
| `ha_update_helper` | Update an existing helper |
| `ha_delete_helper` | Delete a helper |

### Apps & System (18 tools)

| Tool | Description |
|------|-------------|
| `ha_list_addons` | List all installed apps with status |
| `ha_addon_info` | Get detailed info about a specific app |
| `ha_install_addon` | Install an app by slug |
| `ha_start_addon` | Start an app |
| `ha_stop_addon` | Stop an app |
| `ha_restart_addon` | Restart an app |
| `ha_uninstall_addon` | Uninstall an app |
| `ha_addon_options` | Get or set app configuration options |
| `ha_system_info` | Get system info (core, OS, supervisor, host) |
| `ha_check_config` | Validate HA configuration before reload |
| `ha_create_backup` | Create a full or partial backup |
| `ha_list_backups` | List all backups |
| `ha_restart_core` | Restart Home Assistant core |
| `ha_check_api` | Check if the HA API is accessible and responding |
| `ha_get_config` | Get HA configuration (location, units, version, components) |
| `ha_update_core_config` | Update core configuration (internal/external URL, location, units) |
| `ha_get_components` | List all loaded HA integrations/components |
| `ha_get_error_log` | Get the Home Assistant error log contents |

### Entities & Services (18 tools)

| Tool | Description |
|------|-------------|
| `ha_get_states` | Get all entity states (optionally filtered by domain) |
| `ha_get_entity` | Get full state and attributes of a specific entity |
| `ha_call_service` | Call any HA service (turn_on, turn_off, notify, etc.) |
| `ha_list_services` | List available services by domain |
| `ha_render_template` | Render a Jinja2 template |
| `ha_list_entity_registry` | List entities from the entity registry |
| `ha_list_devices` | List all devices |
| `ha_list_areas` | List all areas (rooms) |
| `ha_create_area` | Create a new area |
| `ha_get_history` | Get state history for an entity over a time period |
| `ha_get_logbook` | Get logbook entries (activity log), optionally filtered by entity |
| `ha_get_events` | List all available event types |
| `ha_fire_event` | Fire a custom event to trigger automations |
| `ha_set_state` | Set or create an entity state (virtual sensors, overrides) |
| `ha_delete_state` | Delete an entity state |
| `ha_get_calendars` | List all calendar entities |
| `ha_get_calendar_events` | Get events from a specific calendar |
| `ha_handle_intent` | Handle a conversation/voice intent |

## Architecture

The server uses three transport layers to communicate with Home Assistant:

| Layer | Used For | Library |
|-------|----------|---------|
| REST API (`/api/...`) | Service calls, states, history, templates, Supervisor proxy | Built-in `fetch` |
| WebSocket API (`/api/websocket`) | Dashboard CRUD, automation/script/scene/helper CRUD, entity registry | `ws` |
| SSH/SFTP | File upload/download/list/delete on HA filesystem | `ssh2-sftp-client` |

```
src/
├── index.ts              # MCP server entry point, registers all tools
├── config.ts             # Environment variable parsing and validation
├── ha/
│   ├── rest-client.ts    # REST API client with auth header
│   ├── ws-client.ts      # WebSocket client with auto-reconnect
│   └── sftp-client.ts    # SFTP client with path safety checks
└── tools/
    ├── dashboards.ts     # 6 dashboard tools
    ├── files.ts          # 7 file management tools
    ├── automations.ts    # 17 automation/script/scene/helper tools
    ├── addons.ts         # 18 app and system tools
    └── entities.ts       # 18 entity and service tools
```

## Security Notes

- **SFTP path restrictions**: Read operations are allowed anywhere under `/config/`. Write and delete operations are restricted to safe subdirectories (`www/`, `custom_components/`, `themes/`, `blueprints/`, `scripts/`, `automations/`) and specific files (`configuration.yaml`). Write operations to system directories like `deps/` or `.storage/` are blocked.
- **Token security**: Never commit your `.env` file. The `.gitignore` already excludes it.
- **SSH authentication**: Prefer SSH key-based auth (`HA_SSH_KEY_PATH`) over passwords. Never commit private keys or passwords to source control.

## License

MIT
