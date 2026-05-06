import { createFileRoute } from "@tanstack/react-router";
import { authenticateRequest } from "@/server/auth/request-auth";
import { LocalAgentService } from "@/server/modules/local-agents/service";
import { getLocalDb } from "@/server/runtime/local-db";

function getJwtKey() {
  return process.env.CLERK_SECRET_KEY?.trim() ?? "";
}

function isClerkConfigured() {
  return getJwtKey().length > 0;
}

function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export const Route = createFileRoute("/api/local-agents")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await authenticateRequest(request, getJwtKey());
        if (!auth.userId && isClerkConfigured()) return unauthorized();
        return Response.json(await LocalAgentService.listForUser(await getLocalDb(), auth.userId ?? "", auth.orgId ?? undefined));
      },
    },
  },
});
