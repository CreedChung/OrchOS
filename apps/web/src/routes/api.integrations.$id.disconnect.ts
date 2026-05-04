import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

export const Route = createFileRoute("/api/integrations/$id/disconnect")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const service = new IntegrationService(await getLocalDb());
        return Response.json(service.disconnectIntegration(params.id));
      },
    },
  },
});
