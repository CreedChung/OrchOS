import { Elysia, t } from "elysia";
import { status } from "elysia";
import { ConversationService } from "./service";
import { ConversationModel } from "./model";

export const conversationController = new Elysia({ prefix: "/api/conversations" })
  .requireAuth(true)
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
      body: ConversationModel.updateBody,
      response: {
        200: ConversationModel.response,
        404: ConversationModel.errorNotFound,
      },
    },
  )
  .delete(
    "/:id",
    ({ params: { id } }) => {
      const success = ConversationService.delete(id);
      if (!success) throw status(404, "Conversation not found");
      return { success: true };
    },
    {
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
      body: ConversationModel.sendMessageBody,
      response: ConversationModel.messageResponse,
    },
  );
