import { createFileRoute } from "@tanstack/react-router";

import { getLocalDb } from "@/server/runtime/local-db";
import { CustomAgentService } from "@/server/modules/custom-agents/service";

export const Route = createFileRoute("/api/custom-agents/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const body = (await request.json()) as Partial<{ name: string; url: string; apiKey: string; model: string }>;
        const service = new CustomAgentService(await getLocalDb());
        return Response.json(await service.update(params.id, body));
      },
      DELETE: async ({ params }) => {
        const service = new CustomAgentService(await getLocalDb());
        return Response.json(await service.remove(params.id));
      },
    },
  },
});
