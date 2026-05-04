import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ConversationService } from "@/server/modules/conversation/service";

export const Route = createFileRoute("/api/conversations/$id/messages")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const conv = await ConversationService.get(getLocalDb(), params.id);
        return conv
          ? Response.json(await ConversationService.getMessages(getLocalDb(), params.id))
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
      POST: async ({ params, request }) => {
        const body = (await request.json()) as { content: string };
        const conv = await ConversationService.get(getLocalDb(), params.id);
        return conv
          ? Response.json(await ConversationService.sendAndReply(getLocalDb(), params.id, body.content))
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
    },
  },
});
