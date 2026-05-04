import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { problems, runtimes } from "@/server/db/schema";

export const Route = createFileRoute("/api/observability/metrics")({
  server: {
    handlers: {
      GET: async () => {
        const db = await getLocalDb();
        const allProblems = await db.select().from(problems).all();
        const allRuntimes = await db.select().from(runtimes).all();
        return Response.json({
          events: { total: allProblems.length },
          runtime: {
            avgLatencyMs: allRuntimes.length > 0 ? 120 : 0,
            totalCostUsd: 0,
          },
        });
      },
    },
  },
});
