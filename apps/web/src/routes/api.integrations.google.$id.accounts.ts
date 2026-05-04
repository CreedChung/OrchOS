import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

export const Route = createFileRoute("/api/integrations/google/$id/accounts")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const body = (await request.json()) as {
          clientId: string;
          clientSecret: string;
          refreshToken: string;
          label?: string;
        };
        const service = new IntegrationService(getLocalDb());
        const result = await service.connectGoogleIntegration(params.id as "google-calendar" | "gmail", body);
        return Response.json(result);
      },
    },
  },
});
