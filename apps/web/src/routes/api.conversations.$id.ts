import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ConversationService } from "@/server/modules/conversation/service";

export const Route = createFileRoute("/api/conversations/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const conv = await ConversationService.get(getLocalDb(), params.id);
        return conv
          ? Response.json(conv)
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
      PATCH: async ({ params, request }) => {
        const body = (await request.json()) as {
          title?: string;
          projectId?: string;
          agentId?: string;
          runtimeId?: string;
          archived?: boolean;
          deleted?: boolean;
        };
        const conv = await ConversationService.update(getLocalDb(), params.id, body);
        return conv
          ? Response.json(conv)
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
      DELETE: async ({ params, request }) => {
        const url = new URL(request.url);
        const permanent = url.searchParams.get("permanent") === "true";
        const success = permanent
          ? await ConversationService.hardDelete(getLocalDb(), params.id)
          : await ConversationService.delete(getLocalDb(), params.id);
        return success
          ? Response.json({ success: true })
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
    },
  },
});
