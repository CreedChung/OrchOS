import { t, type UnwrapSchema } from "elysia";

const threadKind = t.Union([
  t.Literal("agent_request"),
  t.Literal("pull_request"),
  t.Literal("issue"),
  t.Literal("mention"),
  t.Literal("system_alert"),
]);

const threadStatus = t.Union([
  t.Literal("open"),
  t.Literal("in_progress"),
  t.Literal("blocked"),
  t.Literal("waiting_user"),
  t.Literal("completed"),
  t.Literal("dismissed"),
]);

const threadPriority = t.Union([
  t.Literal("critical"),
  t.Literal("warning"),
  t.Literal("info"),
]);

const messageType = t.Union([
  t.Literal("request"),
  t.Literal("status_update"),
  t.Literal("question"),
  t.Literal("blocker"),
  t.Literal("artifact"),
  t.Literal("review_request"),
  t.Literal("completion"),
  t.Literal("system_note"),
]);

export const InboxModel = {
  threadResponse: t.Object({
    id: t.String(),
    kind: threadKind,
    status: threadStatus,
    priority: threadPriority,
    title: t.String(),
    summary: t.Optional(t.String()),
    projectId: t.Optional(t.String()),
    conversationId: t.Optional(t.String()),
    commandId: t.Optional(t.String()),
    primaryGoalId: t.Optional(t.String()),
    createdByType: t.Union([t.Literal("user"), t.Literal("agent"), t.Literal("system")]),
    createdById: t.Optional(t.String()),
    createdByName: t.String(),
    lastMessageAt: t.String(),
    createdAt: t.String(),
    updatedAt: t.String(),
    archived: t.Boolean(),
  }),
  messageResponse: t.Object({
    id: t.String(),
    threadId: t.String(),
    messageType,
    senderType: t.Union([t.Literal("user"), t.Literal("agent"), t.Literal("system")]),
    senderId: t.Optional(t.String()),
    senderName: t.String(),
    subject: t.Optional(t.String()),
    body: t.String(),
    to: t.Array(t.String()),
    cc: t.Array(t.String()),
    goalId: t.Optional(t.String()),
    stateId: t.Optional(t.String()),
    problemId: t.Optional(t.String()),
    metadata: t.Optional(t.Record(t.String(), t.Any())),
    createdAt: t.String(),
  }),
  createThreadBody: t.Object({
    kind: threadKind,
    title: t.String(),
    summary: t.Optional(t.String()),
    projectId: t.Optional(t.String()),
    conversationId: t.Optional(t.String()),
    commandId: t.Optional(t.String()),
    primaryGoalId: t.Optional(t.String()),
    createdByType: t.Union([t.Literal("user"), t.Literal("agent"), t.Literal("system")]),
    createdById: t.Optional(t.String()),
    createdByName: t.String(),
    priority: t.Optional(threadPriority),
  }),
  updateThreadBody: t.Object({
    title: t.Optional(t.String()),
    summary: t.Optional(t.String()),
    status: t.Optional(threadStatus),
    priority: t.Optional(threadPriority),
    primaryGoalId: t.Optional(t.String()),
    archived: t.Optional(t.Boolean()),
  }),
  createMessageBody: t.Object({
    messageType,
    senderType: t.Union([t.Literal("user"), t.Literal("agent"), t.Literal("system")]),
    senderId: t.Optional(t.String()),
    senderName: t.String(),
    subject: t.Optional(t.String()),
    body: t.String(),
    to: t.Optional(t.Array(t.String())),
    cc: t.Optional(t.Array(t.String())),
    goalId: t.Optional(t.String()),
    stateId: t.Optional(t.String()),
    problemId: t.Optional(t.String()),
    metadata: t.Optional(t.Record(t.String(), t.Any())),
  }),
} as const;

export type InboxModel = {
  [k in keyof typeof InboxModel]: UnwrapSchema<(typeof InboxModel)[k]>;
};
