import { createFileRoute } from "@tanstack/react-router";
import { events } from "@/server/db/schema";
import { getLocalDb } from "@/server/runtime/local-db";

export const Route = createFileRoute("/api/observability/throughput")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const range = url.searchParams.get("range") || "24h";
        const db = await getLocalDb();
        const rows = await db.select().from(events).all();
        const points = Array.isArray(rows)
          ? rows.slice(0, range === "24h" ? 24 : range === "7d" ? 7 : 30).map((_, index) => ({
              time: index,
              label: `${index + 1}`,
              operations: 0,
              successes: 0,
            }))
          : [];
        return Response.json(points);
      },
    },
  },
});
