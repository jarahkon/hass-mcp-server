# Changelog

All notable changes to this project will be documented in this file.

## [1.0.10] — 2026-03-30

### Fixed

- **Automations, scripts, scenes**: Switched from non-existent WebSocket commands to the correct REST API endpoints (`/api/config/{type}/config/{id}`)
- **Input helpers**: Fixed WebSocket command prefix — removed erroneous `config/` prefix (e.g. `input_datetime/create` instead of `config/input_datetime/create`)
- **SFTP**: Added `automations.yaml`, `scripts.yaml`, and `scenes.yaml` to the allowed write/delete file list

### Changed

- Automation, script, and scene tools now use `RestClient` instead of `WsClient`

## [1.0.0] — 2026-03-22

### Added

- **65 MCP tools** across 5 categories:
  - Dashboards (6 tools) — create, update, delete Lovelace dashboards and deploy configs
  - Files (7 tools) — upload, read, list, delete files on HA via SFTP
  - Automations, Scripts, Scenes & Helpers (17 tools) — full CRUD
  - Apps & System (17 tools) — add-on management, system info, backups, config validation
  - Entities & Services (18 tools) — states, services, templates, registries, events, calendars
- Three transport layers: REST API, WebSocket API, SSH/SFTP
- SFTP path safety checks (directory traversal prevention, write-restricted directories)
- VS Code extension for Marketplace publishing (`vscode-extension/`)
- ESLint + Prettier configuration
- Vitest unit tests (45 tests) and smoke test for tool registration
- GitHub Actions CI/CD workflows (CI on push/PR, npm publish on release)
- MIT License
