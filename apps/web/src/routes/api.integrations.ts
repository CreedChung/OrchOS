import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

async function getService() {
  return new IntegrationService(await getLocalDb());
}

export const Route = createFileRoute("/api/integrations")({
  server: {
    handlers: {
      GET: async () => {
        const service = await getService();
        const integrations = await service.listIntegrations();

        return Response.json(integrations);
      },
    },
  },
});
