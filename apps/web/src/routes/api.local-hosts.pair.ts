import { createFileRoute } from "@tanstack/react-router";
import { LocalHostService } from "@/server/modules/local-hosts/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const Route = createFileRoute("/api/local-hosts/pair")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          pairingToken: string;
          deviceId: string;
          name: string;
          platform?: string;
          appVersion?: string;
          metadata?: Record<string, string>;
        };

        try {
          return Response.json(await LocalHostService.pairHost(await getLocalDb(), body));
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 400 },
          );
        }
      },
    },
  },
});
