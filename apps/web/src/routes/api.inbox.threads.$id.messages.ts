import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { InboxService, type InboxMessageType } from "@/server/modules/inbox/service";

export const Route = createFileRoute("/api/inbox/threads/$id/messages")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        return Response.json(await InboxService.listMessages(await getLocalDb(), params.id));
      },
      POST: async ({ params, request }) => {
        const body = (await request.json()) as {
          messageType: InboxMessageType;
          senderType: "user" | "agent" | "system";
          senderId?: string;
          senderName: string;
          subject?: string;
          body: string;
          to?: string[];
          cc?: string[];
          goalId?: string;
          stateId?: string;
          problemId?: string;
          metadata?: Record<string, unknown>;
        };

        return Response.json(await InboxService.addMessage(await getLocalDb(), params.id, body), {
          status: 201,
        });
      },
    },
  },
});
