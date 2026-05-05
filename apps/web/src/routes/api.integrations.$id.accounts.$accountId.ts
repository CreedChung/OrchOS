import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

export const Route = createFileRoute("/api/integrations/$id/accounts/$accountId")({
  server: {
    handlers: {
      PATCH: async ({ params, request }) => {
        const data = (await request.json()) as { label?: string; email?: string; username?: string; smtpImap?: { email: string; displayName?: string; smtp: { host: string; port: number; secure: boolean }; imap: { host: string; port: number; secure: boolean }; username: string; password: string } };
        const service = new IntegrationService(await getLocalDb());
        return Response.json(service.updateIntegrationAccount(params.id, params.accountId, data));
      },
      DELETE: async ({ params }) => {
        const service = new IntegrationService(await getLocalDb());
        return Response.json(service.deleteIntegrationAccount(params.id, params.accountId));
      },
    },
  },
});
