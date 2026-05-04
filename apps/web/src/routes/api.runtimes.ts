import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes")({
  server: {
    handlers: {
      GET: async () => Response.json(await RuntimeService.list(getLocalDb())),
    },
  },
});
