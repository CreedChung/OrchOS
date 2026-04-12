import { t } from "elysia"

export const McpServerModel = {
  response: t.Object({
    id: t.String(),
    name: t.String(),
    command: t.String(),
    args: t.Array(t.String()),
    env: t.Record(t.String(), t.String()),
    enabled: t.Boolean(),
    scope: t.Union([t.Literal("global"), t.Literal("project")]),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),

  createBody: t.Object({
    name: t.String(),
    command: t.String(),
    args: t.Optional(t.Array(t.String())),
    env: t.Optional(t.Record(t.String(), t.String())),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
  }),

  updateBody: t.Object({
    name: t.Optional(t.String()),
    command: t.Optional(t.String()),
    args: t.Optional(t.Array(t.String())),
    env: t.Optional(t.Record(t.String(), t.String())),
    enabled: t.Optional(t.Boolean()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
  }),

  listQuery: t.Object({
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
  }),
}
