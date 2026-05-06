# AGENTS.md

## Workspace Facts

- Package manager/runtime: `bun@1.3.11` (`package.json`), workspace repo via Bun workspaces.
- Main workspaces: `apps/web` (TanStack Start app with UI and server routes), `apps/addons`, `packages/ui`, `packages/typescript-config`.
- Root scripts are the source of truth: `bun run dev`, `build`, `lint`, `lint:strict`, `format`, `check-types`, `test`.

## Commands That Matter

- Start everything: `bun run dev`
- Start the app directly: `bun run --filter=web dev`
- Lint before committing: `bun run lint:strict`
- Full repo checks: `bun run lint && bun run check-types && bun run test`
- App-local tests:
  - `bun run --filter=web test`

## Pre-commit / Verification

- Lefthook pre-commit runs only `bun run lint:strict`. If this fails, the commit will fail.
- `test` uses `vitest run --passWithNoTests` in `apps/web`, so green test runs may still mean no tests executed.
- Root `lint` is `oxlint`, not ESLint. Root `format` is `oxfmt`, not Prettier, even though Prettier is installed.

## Frontend Wiring

- `apps/web` uses TanStack Start. Entry wiring is `apps/web/src/router.tsx` plus file-based routes under `apps/web/src/routes`.
- Do not hand-edit `apps/web/src/routeTree.gen.ts`; TanStack Router generates it.
- User-facing strings are expected to go through Paraglide messages (`m.*`) rather than hardcoded UI text.
- Paraglide output lives in `apps/web/src/paraglide` and is treated as generated code; root lint config explicitly ignores it.
- App-local server code lives under `apps/web/src/server` and is reached through TanStack Start server routes.

## Backend Wiring

- Server-side modules live under `apps/web/src/server/modules/*`.
- Runtime database behavior is Cloudflare D1-first via `apps/web/src/server/runtime/local-db.ts` and the `DB` binding from `apps/web/wrangler.jsonc`.
- Route handlers under `apps/web/src/routes/api.*` call into the server modules directly.

## Database / Migration Gotcha

- Drizzle config lives at `apps/web/drizzle.config.ts` and uses the D1 HTTP driver, reading `database_id` from `apps/web/wrangler.jsonc`.
- If changing persistence behavior, inspect both `apps/web/src/server/db/*` and `apps/web/src/server/runtime/*` before deciding how migrations should work.

## Repo-Specific Editing Guidance

- Ignore template README claims in app subfolders unless confirmed by source/config; root config is more reliable here.
