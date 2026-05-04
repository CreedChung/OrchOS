import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ProjectService } from "@/server/modules/project/service";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const project = await ProjectService.get(getLocalDb(), params.id);
        return project
          ? Response.json(project)
          : Response.json({ error: "Project not found" }, { status: 404 });
      },
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as { name?: string; path?: string; repositoryUrl?: string };
        const project = await ProjectService.update(getLocalDb(), params.id, body);
        return project
          ? Response.json(project)
          : Response.json({ error: "Project not found" }, { status: 404 });
      },
      DELETE: async ({ params }) => {
        const deleted = await ProjectService.delete(getLocalDb(), params.id);
        return deleted
          ? Response.json({ success: true })
          : Response.json({ error: "Project not found" }, { status: 404 });
      },
    },
  },
});
