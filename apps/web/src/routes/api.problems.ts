import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ProblemService } from "@/server/modules/problem/service";

export const Route = createFileRoute("/api/problems")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get("status") || undefined;
        const priority = url.searchParams.get("priority") || undefined;
        return Response.json(await ProblemService.list(await getLocalDb(), { status: status as any, priority: priority as any }));
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          title: string;
          priority?: "critical" | "warning" | "info";
          source?: string;
          context?: string;
          actions?: string[];
        };
        return Response.json(await ProblemService.create(await getLocalDb(), body));
      },
    },
  },
});
