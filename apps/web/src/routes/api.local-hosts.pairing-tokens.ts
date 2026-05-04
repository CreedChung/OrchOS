import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/server/auth/request-auth";
import { LocalHostService } from "@/server/modules/local-hosts/service";
import { getLocalDb } from "@/server/runtime/local-db";

function getJwtKey() {
  return process.env.CLERK_JWT_KEY?.trim() ?? "";
}

export const Route = createFileRoute("/api/local-hosts/pairing-tokens")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request, getJwtKey());
        if (!auth.userId) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        return Response.json(
          await LocalHostService.createPairingToken(await getLocalDb(), auth.userId, auth.orgId),
        );
      },
    },
  },
});
