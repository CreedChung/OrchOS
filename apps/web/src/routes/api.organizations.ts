import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { OrganizationService } from "@/server/modules/organization";

export const Route = createFileRoute("/api/organizations")({
  server: {
    handlers: {
      GET: async () => Response.json(await OrganizationService.list(await getLocalDb())),
      POST: async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return Response.json(await OrganizationService.create(await getLocalDb(), body.name));
      },
    },
  },
});
