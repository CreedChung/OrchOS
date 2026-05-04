import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { OrganizationService } from "@/server/modules/organization";

export const Route = createFileRoute("/api/organizations/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const org = await OrganizationService.get(await getLocalDb(), params.id);
        return org
          ? Response.json(org)
          : Response.json({ error: "Organization not found" }, { status: 404 });
      },
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as { name?: string };
        const org = await OrganizationService.update(await getLocalDb(), params.id, body);
        return org
          ? Response.json(org)
          : Response.json({ error: "Organization not found" }, { status: 404 });
      },
      DELETE: async ({ params }) => {
        const deleted = await OrganizationService.delete(await getLocalDb(), params.id);
        return deleted
          ? Response.json({ success: true })
          : Response.json({ error: "Organization not found" }, { status: 404 });
      },
    },
  },
});
