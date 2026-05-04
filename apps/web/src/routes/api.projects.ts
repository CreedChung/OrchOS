import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ProjectService } from "@/server/modules/project/service";

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async () => Response.json(await ProjectService.list(await getLocalDb())),
      POST: async ({ request }) => {
        const body = (await request.json()) as { name: string; path: string; repositoryUrl?: string };
        return Response.json(await ProjectService.create(await getLocalDb(), body.name, body.path, body.repositoryUrl));
      },
    },
  },
});
