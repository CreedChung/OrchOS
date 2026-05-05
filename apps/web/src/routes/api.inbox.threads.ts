import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { InboxService, type InboxThreadKind, type InboxThreadStatus } from "@/server/modules/inbox/service";

export const Route = createFileRoute("/api/inbox/threads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const kind = url.searchParams.get("kind") ?? undefined;
        const status = url.searchParams.get("status") ?? undefined;
        const projectId = url.searchParams.get("projectId") ?? undefined;
        const conversationId = url.searchParams.get("conversationId") ?? undefined;

        return Response.json(
          await InboxService.list(await getLocalDb(), {
            kind: kind as InboxThreadKind,
            status: status as InboxThreadStatus,
            projectId,
            conversationId,
          }),
        );
      },
    },
  },
});
