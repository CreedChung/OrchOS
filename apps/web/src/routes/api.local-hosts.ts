import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/server/auth/request-auth";
import { LocalHostService } from "@/server/modules/local-hosts/service";
import { getLocalDb } from "@/server/runtime/local-db";

function getJwtKey() {
  return process.env.CLERK_JWT_KEY?.trim() ?? "";
}

function isClerkConfigured() {
  return getJwtKey().length > 0;
}

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export const Route = createFileRoute("/api/local-hosts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateRequest(request, getJwtKey());
        if (!auth.userId && isClerkConfigured()) return unauthorized();
        return Response.json(await LocalHostService.listForUser(await getLocalDb(), auth.userId ?? "", auth.orgId ?? undefined));
      },
    },
  },
});
