import { createFileRoute } from "@tanstack/react-router";
import { LocalAgentService } from "@/server/modules/local-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

export const Route = createFileRoute("/api/local-agents/pair")({
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
          return Response.json(await LocalAgentService.pairAgent(await getLocalDb(), body));
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
