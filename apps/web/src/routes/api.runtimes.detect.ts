import { createFileRoute } from "@tanstack/react-router";
import { RuntimeService } from "@/server/modules/runtime/service";

export const Route = createFileRoute("/api/runtimes/detect")({
  server: {
    handlers: {
      GET: async () => Response.json(await RuntimeService.detect()),
    },
  },
});
