# AGENTS.md

## Workspace Facts

- Package manager/runtime: `bun@1.3.11` (`package.json`), monorepo via Bun workspaces + Turborepo.
- Main workspaces: `apps/web` (TanStack Start React app), `apps/server` (Elysia/Bun API), `packages/ui`, `packages/typescript-config`.
- Root scripts are the source of truth: `bun run dev`, `build`, `lint`, `lint:strict`, `format`, `check-types`, `test`.

## Commands That Matter

- Start everything: `bun run dev`
- Start one app: `bun --filter=web dev`, `bun --filter=server dev`
- Lint before committing: `bun run lint:strict`
- Full repo checks: `bun run lint && bun run check-types && bun run test`
- App-local tests:
  - `bun --filter=web test`
  - `bun --filter=server test`

## Pre-commit / Verification

- Lefthook pre-commit runs only `bun run lint:strict`. If this fails, the commit will fail.
- `test` uses `vitest run --passWithNoTests` in both apps, so green test runs may still mean no tests executed.
- Root `lint` is `oxlint`, not ESLint. Root `format` is `oxfmt`, not Prettier, even though Prettier is installed.

## Frontend Wiring

- `apps/web` uses TanStack Start. Entry wiring is `apps/web/src/router.tsx` plus file-based routes under `apps/web/src/routes`.
- Do not hand-edit `apps/web/src/routeTree.gen.ts`; TanStack Router generates it.
- User-facing strings are expected to go through Paraglide messages (`m.*`) rather than hardcoded UI text.
- Paraglide output lives in `apps/web/src/paraglide` and is treated as generated code; root lint config explicitly ignores it.
- Vite dev server proxies `/ws` to `http://127.0.0.1:5173`; frontend-only work that touches realtime behavior often also needs the server running.

## Backend Wiring

- Server entrypoint is `apps/server/src/index.ts`; feature controllers are registered there from `apps/server/src/modules/*`.
- Runtime database behavior is in `apps/server/src/db/index.ts`: Bun SQLite, default DB path `cortex.db`, WAL enabled, migrations applied imperatively at startup.
- `apps/server/src/db/seed.ts` seeds a default `Personal` organization on empty DB startup.

## Database / Migration Gotcha

- Do not assume Drizzle config reflects runtime DB. `apps/server/drizzle.config.ts` is configured for PostgreSQL, but the running server uses SQLite via `bun:sqlite` in `src/db/index.ts`.
- If changing persistence behavior, inspect both `src/db/index.ts` and `src/db/schema.ts` before deciding how migrations should work.

## Repo-Specific Editing Guidance

- Ignore template README claims in app subfolders unless confirmed by source/config; root config is more reliable here.
- Existing untracked/modified DB files under `apps/server/` such as `cortex.db`, `cortex.db-shm`, and `cortex.db-wal` are runtime artifacts; avoid committing them unless the user explicitly asks.
