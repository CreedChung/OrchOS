# OrchOS

**AI Agent Orchestration System** - Coordinate multiple AI agents to accomplish complex development goals.

OrchOS provides a dashboard where you can define goals, assign agents, track progress through compatibility state projections, and execute work through a persisted execution graph with runtime policy enforcement.

---

## Features

- **Goal Management** — Create goals with success criteria and track them through projected states backed by execution graphs
- **Execution Graphs** — Persist graph nodes, edges, and attempts for ordered and fallback-aware execution
- **Policy Enforcement** — Validate plans, node execution, tool calls, and file writes before side effects happen
- **Agent Management** — Register local or cloud-based AI agents, auto-detect installed CLIs, and assign agents to goals
- **Native Runtime Adapters** — Execute agents through direct runtime integrations instead of a shared protocol bridge
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
│   ├── web/          # TanStack Start app with UI and server routes
│   └── addons/       # Optional integration assets
├── packages/
│   ├── ui/           # Shared React component stubs
│   └── typescript-config/
```

### Tech Stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Frontend  | React 19, Vite, TanStack Start, TanStack Router |
| Styling   | Tailwind CSS v4, shadcn/ui, Motion            |
| State     | Zustand (persisted to localStorage)           |
| i18n      | Paraglide JS (compile-time)                   |
| Charts    | Recharts                                      |
| Backend   | TanStack Start server routes on Bun, Drizzle ORM, SQLite |
| Real-time | WebSocket event broadcasting                  |
| Workspace | Bun workspaces                                |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3
- Node.js >= 18

### Install & Run

```bash
# Install dependencies
bun install

# Start the app
bun run dev
```

| App      | URL                   | Description            |
| -------- | --------------------- | ---------------------- |
| App      | http://localhost:3000 | Dashboard + API routes |

### Run Individually

```bash
# App only
bun run --filter=web dev
```

### Build

```bash
bun run build
```

---

## Available Scripts

| Command               | Description                   |
| --------------------- | ----------------------------- |
| `bun run dev`         | Start workspace dev tasks     |
| `bun run build`       | Build the workspace           |
| `bun run lint`        | Lint the repository           |
| `bun run check-types` | Type check the workspace      |
| `bun run format`      | Format code with Oxc          |

You can also target specific apps with filters:

```bash
bun run --filter=web dev
bun run --filter=web build
bun run --filter=web test
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

### Graphs

| Method | Path                     | Description                         |
| ------ | ------------------------ | ----------------------------------- |
| POST   | `/api/graphs/compile`    | Compile a goal into an execution graph |
| GET    | `/api/graphs/:id`        | Get graph nodes and edges           |
| POST   | `/api/graphs/:id/run`    | Run a persisted execution graph     |
| GET    | `/api/graphs/:id/trace`  | Inspect node attempt history        |
| GET    | `/api/graphs/:id/policy` | Inspect policy decisions and violations |

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

The app uses **Cloudflare D1** with Drizzle ORM. The `DB` binding is configured in `apps/web/wrangler.jsonc`, and Drizzle reads the D1 `database_id` from that Wrangler config.

Tables: `commands`, `goals`, `states`, `artifacts`, `activities`, `agents`, `projects`, `settings`, `events`, `organizations`, `problems`, `rules`, `mcp_servers`, `skills`, `execution_graphs`, `execution_nodes`, `execution_edges`, `execution_attempts`, `policy_decisions`, `policy_violations`

### Migration Notes

- Existing `states` APIs remain in place as a compatibility projection during the graph migration.
- Command dispatch now compiles planned actions into a persisted graph before execution.
- Goal execution prefers the graph scheduler path; linear state execution remains only as a fallback compatibility path.

### Migrations

```bash
bun run --filter=web db:generate
bun run --filter=web db:migrate:local
bun run --filter=web db:migrate:remote
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

- [TanStack Router](https://tanstack.com/router) — File-based routing for React
- [TanStack Start](https://tanstack.com/start) — Full-stack React framework
- [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) — Compile-time i18n
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM with SQLite
