import { t, type UnwrapSchema } from "elysia";

export const ConversationModel = {
  createBody: t.Object({
    title: t.Optional(t.String()),
    projectId: t.Optional(t.String()),
    agentId: t.Optional(t.String()),
    runtimeId: t.Optional(t.String()),
    deleted: t.Optional(t.Boolean()),
  }),
  updateBody: t.Object({
    title: t.Optional(t.String()),
    projectId: t.Optional(t.String()),
    agentId: t.Optional(t.String()),
    runtimeId: t.Optional(t.String()),
    archived: t.Optional(t.Boolean()),
    deleted: t.Optional(t.Boolean()),
  }),
  sendMessageBody: t.Object({
    content: t.String(),
  }),
  response: t.Object({
    id: t.String(),
    title: t.Optional(t.String()),
    projectId: t.Optional(t.String()),
    agentId: t.Optional(t.String()),
    runtimeId: t.Optional(t.String()),
    archived: t.Boolean(),
    deleted: t.Boolean(),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
  messageResponse: t.Object({
    id: t.String(),
    conversationId: t.String(),
    role: t.Union([t.Literal("user"), t.Literal("assistant")]),
    content: t.String(),
    trace: t.Optional(t.Array(t.Any())),
    error: t.Optional(t.String()),
    responseTime: t.Optional(t.Number()),
    executionMode: t.Optional(t.Union([t.Literal("sandbox"), t.Literal("local")])),
    sandboxStatus: t.Optional(
      t.Union([
        t.Literal("created"),
        t.Literal("reused"),
        t.Literal("fallback"),
        t.Literal("required_failed"),
      ]),
    ),
    sandboxVmId: t.Optional(t.String()),
    projectId: t.Optional(t.String()),
    projectName: t.Optional(t.String()),
    createdAt: t.String(),
  }),
  errorNotFound: t.Object({ error: t.Literal("Conversation not found") }),
} as const;

export type ConversationModel = {
  [k in keyof typeof ConversationModel]: UnwrapSchema<(typeof ConversationModel)[k]>;
};
