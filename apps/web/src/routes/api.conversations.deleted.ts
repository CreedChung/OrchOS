import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ConversationService } from "@/server/modules/conversation/service";

export const Route = createFileRoute("/api/conversations/deleted")({
  server: {
    handlers: {
      DELETE: async () => {
        const count = await ConversationService.clearDeleted(getLocalDb());
        return Response.json({ success: true, count });
      },
    },
  },
});
