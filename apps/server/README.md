# Server

`apps/server` is the OrchOS backend. It runs on Bun with Elysia and uses SQLite through Drizzle.

## Commands

```bash
bun run dev
bun run test
```

## Execution Architecture

- Commands are planned into goal actions.
- Planned actions are compiled into persisted execution graphs.
- Graph nodes are scheduled from dependency state, not by scanning linear states.
- Policy checks run before plan persistence, node execution, tool calls, and file writes.
- Legacy `states` records are still written as a compatibility projection for existing APIs and UI surfaces.

## Key Tables

- `execution_graphs`
- `execution_nodes`
- `execution_edges`
- `execution_attempts`
- `policy_decisions`
- `policy_violations`

## Migration Notes

- Existing command flows should continue to use `POST /api/goals/:goalId/loop`, but execution now routes through the graph scheduler whenever a graph exists for the goal.
- Old state-driven consumers should read `states` as a projection layer, not as the source of truth for execution ordering.
- New execution debugging should prefer graph trace and policy inspection endpoints.
