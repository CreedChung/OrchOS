import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { InboxService, type InboxThreadStatus, type InboxPriority } from "@/server/modules/inbox/service";

export const Route = createFileRoute("/api/inbox/threads/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const thread = await InboxService.get(await getLocalDb(), params.id);
        if (!thread) {
          return new Response("Not found", { status: 404 });
        }
        return Response.json(thread);
      },
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as {
          title?: string;
          summary?: string;
          status?: InboxThreadStatus;
          priority?: InboxPriority;
          primaryGoalId?: string;
          archived?: boolean;
        };

        const thread = await InboxService.update(await getLocalDb(), params.id, body);
        if (!thread) {
          return new Response("Not found", { status: 404 });
        }
        return Response.json(thread);
      },
    },
  },
});
