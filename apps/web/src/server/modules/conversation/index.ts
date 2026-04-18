import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { ConversationService } from "./service";
import { ConversationModel } from "./model";

export function createConversationController(db: AppDb) {
  return new Elysia({
    prefix: "/api/conversations",
  })
    .get(
      "/",
      async () => {
        return await ConversationService.list(db);
      },
      {
        response: t.Array(ConversationModel.response),
      },
    )
    .get(
      "/:id",
      async ({ params: { id } }) => {
        const conv = await ConversationService.get(db, id);
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
        return await ConversationService.create(db, body);
      },
      {
        body: ConversationModel.createBody,
        response: ConversationModel.response,
      },
    )
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        const conv = await ConversationService.update(db, id, body);
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
      "/:id",
      async ({ params: { id } }) => {
        const success = await ConversationService.delete(db, id);
        if (!success) throw status(404, "Conversation not found");
        return { success: true };
      },
      {
        params: t.Object({ id: t.String() }),
        response: t.Object({ success: t.Boolean() }),
      },
    )
    .get(
      "/:id/messages",
      async ({ params: { id } }) => {
        const conv = await ConversationService.get(db, id);
        if (!conv) throw status(404, "Conversation not found");
        return await ConversationService.getMessages(db, id);
      },
      {
        params: t.Object({ id: t.String() }),
        response: t.Array(ConversationModel.messageResponse),
      },
    )
    .post(
      "/:id/messages",
      async ({ params: { id }, body }) => {
        const conv = await ConversationService.get(db, id);
        if (!conv) throw status(404, "Conversation not found");
        return await ConversationService.sendAndReply(db, id, body.content);
      },
      {
        params: t.Object({ id: t.String() }),
        body: ConversationModel.sendMessageBody,
        response: ConversationModel.messageResponse,
      },
    );
}
