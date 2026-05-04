import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

function getService() {
  return new IntegrationService(getLocalDb());
}

export const Route = createFileRoute("/api/integrations")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(getService().listIntegrations());
      },
    },
  },
});
