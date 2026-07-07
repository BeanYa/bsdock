# AGENTS.md

## Project overview

BSDock is a Panel-Node management platform with two deployment sides:

- Panel side: `web/` is the Panel-Frontend source, and `panel/` is the Panel-Backend Go module (`github.com/bsdock/panel`). Production panel binaries embed the built frontend.
- Node side: `agent/` is the node-side Go agent (`github.com/bsdock/agent`) for monitoring and proxy/transport work.
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

## GitNexus workflow constraints

- Before modifying any function, class, or method, run `impact` analysis to understand the blast radius.
  ```bash
  npx gitnexus@latest impact <symbol-name> --upstream
  ```
- Before committing changes, run `detect-changes` to verify only expected symbols and execution flows are affected.
  ```bash
  npx gitnexus@latest detect-changes
  ```

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **bsdock** (1618 symbols, 3727 relationships, 94 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/bsdock/context` | Codebase overview, check index freshness |
| `gitnexus://repo/bsdock/clusters` | All functional areas |
| `gitnexus://repo/bsdock/processes` | All execution flows |
| `gitnexus://repo/bsdock/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
