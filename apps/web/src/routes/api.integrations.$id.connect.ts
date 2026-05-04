import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

export const Route = createFileRoute("/api/integrations/$id/connect")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const body = (await request.json()) as { accessToken: string; apiUrl?: string };
        const service = new IntegrationService(getLocalDb());
        const result = await service.connectIntegration(params.id as "github" | "gitlab", body);
        return Response.json(result);
      },
    },
  },
});
