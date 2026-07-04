# BSDock

BSDock is a Panel-Node management platform. It provides a central web panel for creating nodes, generating install commands, and viewing real-time system information from agents running on each node.

## Architecture

```
Panel-Frontend (Vite + React)  <--->  Panel-Backend (Go)  <--->  Agent (Go)
```

- **panel** – Go backend module (`github.com/bsdock/panel`). Serves the API, frontend static files, and agent endpoints.
- **agent** – Go static binary (`github.com/bsdock/agent`). Collects system info and reports to the panel over WebSocket, HTTP, or pull mode.
- **web** – Vite + React + TanStack Router + Tailwind CSS + shadcn/ui frontend.

## Requirements

- [Go](https://go.dev/) 1.24+
- [Bun](https://bun.sh/)
- [Task](https://taskfile.dev/) (optional)

## Quick start

```bash
# Install frontend dependencies
cd web && bun install && cd ..

# Run panel backend and Vite dev server concurrently
bun run dev
```

The panel backend listens on `http://localhost:8080` and the dev server on `http://localhost:5173`.

Configure the initial admin user via environment variables or `config.yaml`:

```yaml
admin:
  username: admin
  password: changeme
```

## Commands

| Command | Description |
| ------- | ----------- |
| `bun run dev` | Run panel backend and web dev server |
| `bun run build` | Build web, panel, and agent binaries |
| `bun run test` | Run backend and frontend unit tests |
| `bun run e2e` | Run Playwright E2E tests (requires `bunx playwright install chromium`) |
| `task dev` | Same as `bun run dev` |
| `task test` | Same as `bun run test` |

## Agent install command

After creating a node in the panel, run the generated command on the target server:

```bash
bash <(curl -fsSL https://<panel>/install-agent.sh) --panel <panel-url> --token <token>
```

The agent will register itself, mark the node as `online`, and start reporting system information.

## Agent transport modes

The agent supports three connection modes and automatically falls back:

1. `websocket` – persistent WebSocket connection
2. `http` – periodic HTTP reports
3. `pull` – node-initiated polling

Set `--mode auto` (default) to let the agent try WebSocket first and fall back to HTTP/pull.

## Deployment

The panel is distributed as a single static binary (`dist/panel`) that embeds the built frontend. Agent binaries are built for `linux/amd64` and `linux/arm64`.

Releases are created automatically by `.github/workflows/release.yml` when a `v*` tag is pushed.

## Testing

- Backend: `cd panel && go test ./...`
- Agent: `cd agent && go test ./...`
- Frontend: `cd web && bun run test`
- E2E: `cd web && bun run e2e`

E2E tests require a Chromium browser. Install it with:

```bash
cd web && bunx playwright install chromium
```
