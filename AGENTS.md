# AGENTS.md

## Project overview

BSDock is a Panel-Node management platform with a monorepo layout:

- `panel/` – Go backend (`github.com/bsdock/panel`)
- `agent/` – Go agent (`github.com/bsdock/agent`)
- `web/` – Vite + React + TanStack Router + Tailwind CSS + shadcn/ui frontend
- `go.work` – Go workspace including `panel/`, `agent/`, and `web/`
- `package.json` – Root bun scripts

## 沟通语言

所有面向用户的回复、说明和交互必须使用中文。代码、命令、文件路径、标识符和技术术语保持原始形式不变。

## Build and test commands

- Build all: `bun run build`
- Run: `bun run dev`
- Backend tests: `cd panel && go test ./...`
- Agent tests: `cd agent && go test ./...`
- Frontend unit tests: `cd web && bun run test`
- E2E tests: `cd web && bun run e2e` (requires `bunx playwright install chromium`)

## Code style guidelines

- Go: standard formatting via `gofmt`, follow Go conventions
- TypeScript/React: use strict TypeScript, functional components, and shadcn/ui primitives
- Tailwind: prefer utility classes over custom CSS; use CSS variables for theming

## Testing instructions

- Write backend/agent tests with the standard Go testing package.
- Add frontend component tests with Vitest + Testing Library when logic warrants it.
- E2E tests live in `web/tests/e2e/` and use Playwright.
- On Windows, Device Guard may block spawned panel binaries during local E2E runs; CI runs on Linux are the canonical E2E environment.

## Security considerations

- JWT secrets and admin credentials must be set via environment variables or config file; never commit secrets.
- WebSocket `CheckOrigin` currently allows all origins; configure for production.
- Agent install tokens are single-use and expire based on configuration.
