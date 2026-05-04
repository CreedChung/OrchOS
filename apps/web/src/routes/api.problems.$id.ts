import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ProblemService } from "@/server/modules/problem/service";

export const Route = createFileRoute("/api/problems/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const problem = await ProblemService.get(getLocalDb(), params.id);
        return problem
          ? Response.json(problem)
          : Response.json({ error: "Problem not found" }, { status: 404 });
      },
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as {
          title?: string;
          priority?: "critical" | "warning" | "info";
          status?: "open" | "fixed" | "ignored" | "assigned";
          source?: string;
          context?: string;
        };
        const problem = await ProblemService.update(getLocalDb(), params.id, body);
        return problem
          ? Response.json(problem)
          : Response.json({ error: "Problem not found" }, { status: 404 });
      },
      DELETE: async ({ params }) => {
        const deleted = await ProblemService.delete(getLocalDb(), params.id);
        return deleted
          ? Response.json({ success: true })
          : Response.json({ error: "Problem not found" }, { status: 404 });
      },
    },
  },
});
