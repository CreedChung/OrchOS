import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ConversationService } from "@/server/modules/conversation/service";

export const Route = createFileRoute("/api/conversations")({
  server: {
    handlers: {
      GET: async () => Response.json(await ConversationService.list(getLocalDb())),
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          title?: string;
          projectId?: string;
          agentId?: string;
          runtimeId?: string;
          archived?: boolean;
          deleted?: boolean;
        };
        return Response.json(await ConversationService.create(getLocalDb(), body));
      },
    },
  },
});
