import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { IntegrationService } from "@/server/modules/integration/service";

export const Route = createFileRoute("/api/integrations/smtp-imap/accounts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          email: string;
          displayName?: string;
          username: string;
          password: string;
          smtp: { host: string; port: number; secure: boolean };
          imap: { host: string; port: number; secure: boolean };
        };
        const service = new IntegrationService(getLocalDb());
        return Response.json(service.createSmtpImapAccount(body));
      },
    },
  },
});
