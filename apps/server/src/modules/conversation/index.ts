import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { ConversationService } from "@/modules/conversation/service";
import { ConversationModel } from "@/modules/conversation/model";
import { CommandService } from "@/modules/command/service";

export const conversationController = new Elysia({ prefix: "/api/conversations" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => ConversationService.list(), {
    response: t.Array(ConversationModel.response),
  })
  .get(
    "/:id",
    ({ params: { id } }) => {
      const conv = ConversationService.get(id);
      if (!conv) throw status(404, "Conversation not found");
      return conv;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: ConversationModel.response,
        404: ConversationModel.errorNotFound,
      },
    },
  )
  .post(
    "/",
    async ({ body }) => {
      return ConversationService.create(body);
    },
    {
      body: ConversationModel.createBody,
      response: ConversationModel.response,
    },
  )
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const conv = ConversationService.update(id, body);
      if (!conv) throw status(404, "Conversation not found");
      return conv;
    },
    {
      params: t.Object({ id: t.String() }),
      body: ConversationModel.updateBody,
      response: {
        200: ConversationModel.response,
        404: ConversationModel.errorNotFound,
      },
    },
  )
  .delete(
    "/deleted",
    () => {
      return { success: true, count: ConversationService.clearDeleted() };
    },
    {
      response: t.Object({ success: t.Boolean(), count: t.Number() }),
    },
  )
  .delete(
    "/:id",
    ({ params: { id }, query }) => {
      const success = ConversationService.delete(id, {
        permanent: query.permanent === "true",
      });
      if (!success) throw status(404, "Conversation not found");
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ permanent: t.Optional(t.String()) }),
      response: t.Object({ success: t.Boolean() }),
    },
  )
  .get(
    "/:id/messages",
    ({ params: { id } }) => {
      const conv = ConversationService.get(id);
      if (!conv) throw status(404, "Conversation not found");
      return ConversationService.getMessages(id);
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Array(ConversationModel.messageResponse),
    },
  )
  .post(
    "/:id/messages",
    async ({ params: { id }, body }) => {
      const conv = ConversationService.get(id);
      if (!conv) throw status(404, "Conversation not found");
      return ConversationService.sendAndReply(id, body.content);
    },
    {
      params: t.Object({ id: t.String() }),
      body: ConversationModel.sendMessageBody,
      response: ConversationModel.messageResponse,
    },
  )
  .post(
    "/:id/create-goals",
    async ({ params: { id }, body }) => {
      const conv = ConversationService.get(id);
      if (!conv) throw status(404, "Conversation not found");

      const runtimeId = body.runtimeId || conv.runtimeId;
      if (!runtimeId) throw status(400, "No runtime configured for this conversation");

      const command = CommandService.create({
        instruction: body.instruction,
        agentNames: body.agentNames,
        projectIds: conv.projectId ? [conv.projectId] : body.projectIds,
      });

      return CommandService.dispatchAsync(command, runtimeId);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        instruction: t.String(),
        runtimeId: t.Optional(t.String()),
        agentNames: t.Optional(t.Array(t.String())),
        projectIds: t.Optional(t.Array(t.String())),
      }),
      response: t.Object({
        command: t.Object({
          id: t.String(),
          instruction: t.String(),
          agentNames: t.Array(t.String()),
          projectIds: t.Array(t.String()),
          goalId: t.Nullable(t.String()),
          status: t.String(),
          createdAt: t.String(),
        }),
        goals: t.Array(
          t.Object({
            id: t.String(),
            title: t.String(),
            assignedAgentName: t.Optional(t.String()),
          }),
        ),
      }),
    },
  );
