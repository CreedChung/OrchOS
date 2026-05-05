import { createFileRoute } from "@tanstack/react-router";

import { getLocalDb } from "@/server/runtime/local-db";
import { CustomAgentService } from "@/server/modules/custom-agents/service";

export const Route = createFileRoute("/api/custom-agents")({
  server: {
    handlers: {
      GET: async () => {
        const service = new CustomAgentService(await getLocalDb());
        return Response.json(await service.list());
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as { name: string; url: string; apiKey: string; model: string };
        const service = new CustomAgentService(await getLocalDb());
        return Response.json(await service.create(body));
      },
    },
  },
});
