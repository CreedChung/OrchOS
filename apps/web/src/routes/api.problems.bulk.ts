import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ProblemService } from "@/server/modules/problem/service";

export const Route = createFileRoute("/api/problems/bulk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { ids: string[]; status: "open" | "fixed" | "ignored" | "assigned" };
        const updated = await ProblemService.bulkUpdate(getLocalDb(), body.ids, { status: body.status });
        return Response.json({ updated });
      },
    },
  },
});
