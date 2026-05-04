import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes/$id")({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as {
          status?: "idle" | "active" | "error";
          enabled?: boolean;
          transport?: "stdio" | "tcp";
        };
        const db = await getLocalDb();
        let runtime = null;
        if (body.status !== undefined) runtime = await RuntimeService.updateStatus(db, params.id, body.status);
        else if (body.enabled !== undefined) runtime = await RuntimeService.updateEnabled(db, params.id, body.enabled);
        else if (body.transport !== undefined) runtime = await RuntimeService.updateConfig(db, params.id, body);
        return runtime
          ? Response.json(runtime)
          : Response.json({ error: "Runtime not found" }, { status: 404 });
      },
    },
  },
});
