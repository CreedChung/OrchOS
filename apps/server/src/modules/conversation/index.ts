import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { ConversationService } from "@/modules/conversation/service";
import { ConversationModel } from "@/modules/conversation/model";

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
  );
