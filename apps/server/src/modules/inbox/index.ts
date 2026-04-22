import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { InboxModel } from "@/modules/inbox/model";
import { InboxService } from "@/modules/inbox/service";

export const inboxController = new Elysia({ prefix: "/api/inbox" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/threads",
    ({ query }) => {
      return InboxService.listThreads({
        kind: query.kind as any,
        status: query.status as any,
        projectId: query.projectId,
        conversationId: query.conversationId,
      });
    },
    {
      query: t.Object({
        kind: t.Optional(
          t.Union([
            t.Literal("agent_request"),
            t.Literal("pull_request"),
            t.Literal("issue"),
            t.Literal("mention"),
            t.Literal("system_alert"),
          ]),
        ),
        status: t.Optional(
          t.Union([
            t.Literal("open"),
            t.Literal("in_progress"),
            t.Literal("blocked"),
            t.Literal("waiting_user"),
            t.Literal("completed"),
            t.Literal("dismissed"),
          ]),
        ),
        projectId: t.Optional(t.String()),
        conversationId: t.Optional(t.String()),
      }),
      response: t.Array(InboxModel.threadResponse),
    },
  )
  .post(
    "/threads",
    ({ body }) => InboxService.createThread(body),
    {
      body: InboxModel.createThreadBody,
      response: InboxModel.threadResponse,
    },
  )
  .get(
    "/threads/:id",
    ({ params: { id } }) => {
      const thread = InboxService.getThread(id);
      if (!thread) throw status(404, "Inbox thread not found");
      return thread;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: InboxModel.threadResponse,
        404: t.String(),
      },
    },
  )
  .patch(
    "/threads/:id",
    ({ params: { id }, body }) => {
      const thread = InboxService.updateThread(id, body);
      if (!thread) throw status(404, "Inbox thread not found");
      return thread;
    },
    {
      params: t.Object({ id: t.String() }),
      body: InboxModel.updateThreadBody,
      response: {
        200: InboxModel.threadResponse,
        404: t.String(),
      },
    },
  )
  .get(
    "/threads/:id/messages",
    ({ params: { id } }) => {
      const thread = InboxService.getThread(id);
      if (!thread) throw status(404, "Inbox thread not found");
      return InboxService.getMessages(id);
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Array(InboxModel.messageResponse),
    },
  )
  .post(
    "/threads/:id/messages",
    ({ params: { id }, body }) => {
      const thread = InboxService.getThread(id);
      if (!thread) throw status(404, "Inbox thread not found");
      return InboxService.addMessage({ threadId: id, ...body });
    },
    {
      params: t.Object({ id: t.String() }),
      body: InboxModel.createMessageBody,
      response: InboxModel.messageResponse,
    },
  );
