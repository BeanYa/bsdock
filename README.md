# BSDock

BSDock is a Panel-Node management platform. It provides a central panel for managing remote nodes and an agent binary that runs on each node.

## Structure

- `panel/` – Go backend module (`github.com/bsdock/panel`)
- `agent/` – Go agent module (`github.com/bsdock/agent`)
- `web/` – Frontend application (to be added)
- `go.work` – Go workspace that includes `panel/` and `agent/`
- `package.json` – Root bun scripts for development, build, and test

## Requirements

- [Go](https://go.dev/) 1.24+
- [Bun](https://bun.sh/)
- [Task](https://taskfile.dev/) (optional)

## Quick start

```bash
bun run dev
```

This starts the panel backend and the Vite dev server concurrently.

## Commands

| Command | Description |
| ------- | ----------- |
| `bun run dev` | Run panel and web dev servers |
| `bun run build` | Build web, panel, and agent |
| `bun run test` | Run all tests |
| `task dev` | Same as `bun run dev` via Task |
| `task test` | Same as `bun run test` via Task |
