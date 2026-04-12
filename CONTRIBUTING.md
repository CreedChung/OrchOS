# Contributing to OrchOS

First off, thank you for considering contributing to OrchOS! We appreciate your time and effort, and we want to make the contribution process as smooth as possible.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

This project and everyone participating in it is governed by the following principles:

- **Be respectful** — Treat everyone with respect. No harassment, discrimination, or personal attacks.
- **Be constructive** — Provide helpful, actionable feedback. Critique ideas, not people.
- **Be collaborative** — Work together toward the best solution. Listen to different perspectives.
- **Be patient** — Not everyone has the same level of experience. Help others learn and grow.

Unacceptable behavior will not be tolerated. If you witness or experience any issues, please report them by opening an issue or contacting a maintainer directly.

---

## How Can I Contribute?

### Ways to Contribute

- **Bug fixes** — Fix an existing issue
- **New features** — Implement a requested feature or propose your own
- **Documentation** — Improve or translate documentation
- **Testing** — Add or improve test coverage
- **Performance** — Optimize existing code
- **Accessibility** — Improve UI accessibility
- **i18n** — Add translations for new languages

### Good First Issues

Look for issues labeled `good first issue` or `help wanted` in the issue tracker. These are great entry points for new contributors.

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3
- Node.js >= 18
- Git

### Install & Run

```bash
# Clone the repository
git clone https://github.com/your-org/OrchOS.git
cd OrchOS

# Install dependencies
bun install

# Start development servers
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

### Useful Commands

| Command               | Description                  |
| --------------------- | ---------------------------- |
| `bun run dev`         | Start all apps in dev mode   |
| `bun run build`       | Build all apps               |
| `bun run lint`        | Lint all packages            |
| `bun run check-types` | Type check all packages      |
| `bun run format`      | Format code with Prettier    |

---

## Project Architecture

```
OrchOS/
├── apps/
│   ├── web/          # React frontend (Vite + TanStack Router)
│   └── server/       # Elysia backend (Bun runtime) — "Cortex"
├── packages/
│   ├── ui/           # Shared React components
│   ├── eslint-config/
│   └── typescript-config/
```

### Tech Stack

| Layer       | Technology                                    |
| ----------- | --------------------------------------------- |
| Frontend    | React 19, Vite, TanStack Router               |
| Styling     | Tailwind CSS v4, shadcn/ui, Motion            |
| State       | Zustand (persisted to localStorage)           |
| i18n        | Paraglide JS (compile-time)                   |
| Backend     | Elysia on Bun, Drizzle ORM, SQLite (WAL mode) |
| Real-time   | WebSocket event broadcasting                  |
| Monorepo    | Turborepo, Bun workspaces                     |

### Key Directories

- **`apps/web/src/components/`** — UI components, dialogs, layout, pages
- **`apps/web/src/lib/`** — Utilities, API client, store, i18n, hooks
- **`apps/web/src/routes/`** — TanStack Router file-based routes
- **`apps/server/src/modules/`** — Backend feature modules (goal, agent, command, etc.)
- **`apps/server/src/db/`** — Database schema, migrations, seed data

---

## Development Workflow

1. **Fork** the repository and create your branch from `main`
2. **Make changes** following the coding standards below
3. **Test** your changes locally
4. **Commit** with a descriptive message following our conventions
5. **Push** to your fork and open a Pull Request

### Branch Naming

Use descriptive branch names with a prefix:

```
feat/add-user-auth
fix/websocket-reconnect
docs/api-endpoints
refactor/state-management
```

### Keeping Your Branch Updated

```bash
git remote add upstream https://github.com/your-org/OrchOS.git
git fetch upstream
git rebase upstream/main
```

---

## Coding Standards

### General

- Use **TypeScript** for all new code (strict mode)
- Follow the existing code style in each file — consistency matters
- Keep functions small and focused — each function should do one thing well
- Avoid unnecessary abstractions — prefer simplicity

### Frontend (React)

- Use **functional components** with hooks
- Use **Zustand** for global state management
- Use **shadcn/ui** components when available — don't reinvent the wheel
- Follow the existing file naming conventions:
  - Components: `PascalCase.tsx`
  - Utilities: `camelCase.ts`
  - Styles: use Tailwind CSS classes
- Use **Paraglide JS** for all user-facing strings — never hardcode text

### Backend (Elysia)

- Follow the **module pattern**: each feature has `index.ts` (controller), `service.ts`, and `model.ts`
- Use **Drizzle ORM** for all database operations — never write raw SQL
- Use the **EventBus** for cross-module communication
- Use **Elysia's type system** (`t.Object`, `t.String`, etc.) for request/response validation
- Keep service methods **static** on abstract classes (follow existing pattern)

### Database

- Add new tables to `apps/server/src/db/schema.ts`
- Add migrations to the `migrate()` function in `apps/server/src/db/index.ts`
- Always add appropriate indexes for foreign keys

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                              |
| ---------- | ---------------------------------------- |
| `feat`     | A new feature                            |
| `fix`      | A bug fix                                |
| `docs`     | Documentation only changes               |
| `style`    | Code style changes (formatting, etc.)    |
| `refactor` | Code refactoring without behavior change |
| `perf`     | Performance improvement                  |
| `test`     | Adding or updating tests                 |
| `chore`    | Build, CI, or tooling changes            |

### Examples

```
feat(dashboard): add goal progress bar
fix(websocket): handle reconnection on disconnect
docs(api): add command endpoints documentation
refactor(state): simplify state machine transitions
```

### Tips

- Use the **imperative mood** in the subject line: "add feature" not "added feature"
- Keep the subject line under **72 characters**
- Reference issues in the footer: `Closes #123`

---

## Pull Request Process

1. **Update documentation** if your changes affect public APIs or user-facing behavior
2. **Add tests** for new features or bug fixes when applicable
3. **Ensure all checks pass**:
   - `bun run lint` — No linting errors
   - `bun run check-types` — No type errors
   - `bun run build` — Builds successfully
4. **Write a clear PR description** including:
   - What changed and why
   - How to test the changes
   - Any breaking changes or migration steps
5. **Request review** from a maintainer
6. **Address review feedback** promptly and push new commits

### PR Title Format

Use the same format as commit messages:

```
feat(agents): add health check endpoint
fix(commands): dispatch command to agents on creation
```

---

## Reporting Issues

When reporting a bug, please include:

1. **Steps to reproduce** — Detailed steps that trigger the issue
2. **Expected behavior** — What you expected to happen
3. **Actual behavior** — What actually happened
4. **Environment** — OS, Bun version, Node.js version
5. **Screenshots/logs** — If applicable

When requesting a feature, please include:

1. **Use case** — Why do you need this feature?
2. **Proposed solution** — How should it work?
3. **Alternatives considered** — What other approaches did you think of?

---

## License

By contributing to OrchOS, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing! Every contribution, no matter how small, makes a difference.
