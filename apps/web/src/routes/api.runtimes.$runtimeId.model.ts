import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes/$runtimeId/model")({
  server: {
    handlers: {
      GET: async ({ params }) => Response.json(await RuntimeService.getCurrentModel(getLocalDb(), params.runtimeId)),
    },
  },
});
