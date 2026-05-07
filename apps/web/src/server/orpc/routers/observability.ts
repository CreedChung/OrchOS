import { events, problems, runtimes } from "@/server/db/schema";
import { os } from "@/server/orpc/base";
import { getLocalDb } from "@/server/runtime/local-db";

export const observabilityRouter = {
  throughput: os.observability.throughput.handler(async ({ input }) => {
    const range = input.range ?? "24h";
    const db = await getLocalDb();
    const rows = await db.select().from(events).all();

    if (!Array.isArray(rows)) {
      return [];
    }

    const size = range === "24h" ? 24 : range === "7d" ? 7 : 30;
    return rows.slice(0, size).map((_, index) => ({
      time: index,
      label: `${index + 1}`,
      operations: 0,
      successes: 0,
    }));
  }),
  metrics: os.observability.metrics.handler(async () => {
    const db = await getLocalDb();
    const allProblems = await db.select().from(problems).all();
    const allRuntimes = await db.select().from(runtimes).all();

    return {
      events: { total: allProblems.length },
      runtime: {
        avgLatencyMs: allRuntimes.length > 0 ? 120 : 0,
        totalCostUsd: 0,
      },
    };
  }),
};
