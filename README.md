# OrchOS

**AI Agent Orchestration System** — Coordinate multiple AI agents to accomplish complex development goals.

OrchOS provides a dashboard where you can define goals, assign agents, track progress through a state machine (tests → build → lint → review → deploy), and manage problems that arise during execution.

---

## Features

- **Goal Management** — Create goals with success criteria and track them through a multi-stage state machine
- **Agent Management** — Register local or cloud-based AI agents, auto-detect installed CLIs, and assign agents to goals
- **Problem Inbox** — Collect issues from GitHub PRs, test failures, lint errors, and convert them to goals
- **Automation Rules** — Define conditions and actions to auto-fix, ignore, or assign reviewers
- **MCP Server Management** — Manage Model Context Protocol server profiles with global or project scoping
- **Skills** — Define reusable capabilities like Code Review, Test Generation, Security Audit
- **Natural Language Commands** — Submit instructions like "Implement login system" and let agents execute
- **Real-time Observability** — Activity feed, event tracking, and metrics via WebSocket
- **Multi-Organization** — Switch between organizations with scoped settings, MCP servers, and skills
- **i18n** — English, Simplified Chinese, Traditional Chinese (powered by Paraglide JS)
- **Dark/Light Theme** — Auto-detect or manually toggle, persisted across sessions

---

## Architecture

```
OrchOS/
├── apps/
│   ├── web/          # React frontend (Vite + TanStack Router)
│   └── server/       # Elysia backend (Bun runtime) — "Cortex"
├── packages/
│   ├── ui/           # Shared React component stubs
│   └── typescript-config/
```

### Tech Stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Frontend  | React 19, Vite, TanStack Router               |
| Styling   | Tailwind CSS v4, shadcn/ui, Motion            |
| State     | Zustand (persisted to localStorage)           |
| i18n      | Paraglide JS (compile-time)                   |
| Charts    | Recharts                                      |
| Backend   | Elysia on Bun, Drizzle ORM, SQLite (WAL mode) |
| Real-time | WebSocket event broadcasting                  |
| Monorepo  | Turborepo, Bun workspaces                     |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3
- Node.js >= 18

### Install & Run

```bash
# Install dependencies
bun install

# Start both frontend and backend
bun run dev
```

| App      | URL                   | Description            |
| -------- | --------------------- | ---------------------- |
| Frontend | http://localhost:3000 | React dashboard        |
| Backend  | http://localhost:5173 | API server + WebSocket |

### Run Individually

```bash
# Backend only
bun --filter=server dev

# Frontend only
bun --filter=web dev
```

### Build

```bash
bun run build
```

---

## Available Scripts

| Command               | Description                   |
| --------------------- | ----------------------------- |
| `bun run dev`         | Start all apps in dev mode    |
| `bun run build`       | Build all apps for production |
| `bun run lint`        | Lint all packages             |
| `bun run check-types` | Type check all packages       |
| `bun run format`      | Format code with Prettier     |

You can also target specific apps with filters:

```bash
bun --filter=web dev
bun --filter=server dev
bun --filter=web build
```

---

## API Endpoints

### Agents

| Method | Path                          | Description                |
| ------ | ----------------------------- | -------------------------- |
| GET    | `/api/agents`                 | List all agents            |
| POST   | `/api/agents`                 | Create an agent            |
| GET    | `/api/agents/detect`          | Auto-detect installed CLIs |
| POST   | `/api/agents/detect/register` | Register detected agents   |
| PATCH  | `/api/agents/:id`             | Update agent status        |
| GET    | `/api/agents/:id/health`      | Agent health check         |

### Goals

| Method | Path                        | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/api/goals`                | List all goals          |
| POST   | `/api/goals`                | Create a goal           |
| GET    | `/api/goals/:id`            | Get goal details        |
| PATCH  | `/api/goals/:id`            | Update a goal           |
| DELETE | `/api/goals/:id`            | Delete a goal           |
| GET    | `/api/goals/:id/states`     | Get goal states         |
| GET    | `/api/goals/:id/artifacts`  | Get goal artifacts      |
| GET    | `/api/goals/:id/activities` | Get goal activity log   |
| POST   | `/api/goals/:id/actions`    | Trigger state action    |
| POST   | `/api/goals/:id/loop`       | Run goal execution loop |

### More

- **Projects** — `GET/POST/PATCH/DELETE /api/projects`
- **Problems** — `GET/POST/PATCH/DELETE /api/problems` (with bulk update)
- **Rules** — `GET/POST/PATCH/DELETE /api/rules`
- **Commands** — `GET/POST/PATCH/DELETE /api/commands`
- **MCP Servers** — `GET/POST/PATCH/DELETE /api/mcp-servers`
- **Skills** — `GET/POST/PATCH/DELETE /api/skills`
- **Settings** — `GET/PATCH /api/settings`
- **Events** — `GET /api/events`, `GET /api/activities`
- **WebSocket** — `WS /ws` for real-time events

---

## Database

The backend uses **SQLite** with Drizzle ORM. The database file (`cortex.db`) is stored in `apps/server/` and uses WAL mode for concurrent reads/writes.

Tables: `commands`, `goals`, `states`, `artifacts`, `activities`, `agents`, `projects`, `settings`, `events`, `organizations`, `problems`, `rules`, `mcp_servers`, `skills`

### Migrations

```bash
cd apps/server
bun --filter=server drizzle-kit generate
bun --filter=server drizzle-kit migrate
```

---

## Keyboard Shortcuts

| Shortcut           | Action           |
| ------------------ | ---------------- |
| `Cmd+K` / `Ctrl+K` | Open command bar |

---

## Project Structure (Frontend)

```
apps/web/src/
├── components/       # UI components, dialogs, layout, pages
├── lib/              # Utilities, API client, store, i18n, hooks
├── routes/           # TanStack Router file-based routes
├── paraglide/        # Generated i18n messages
└── styles.css        # Tailwind CSS entry
```

---

## Learn More

- [Turborepo](https://turborepo.dev/docs) — Monorepo task orchestration
- [TanStack Router](https://tanstack.com/router) — File-based routing for React
- [Elysia](https://elysiajs.com/) — Ergonomic web framework for Bun
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) — Compile-time i18n
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM with SQLite
