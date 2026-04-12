import { t } from "elysia"

export const SkillModel = {
  response: t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Optional(t.String()),
    enabled: t.Boolean(),
    scope: t.Union([t.Literal("global"), t.Literal("project")]),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),

  createBody: t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
  }),

  updateBody: t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    enabled: t.Optional(t.Boolean()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
  }),

  listQuery: t.Object({
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
  }),
}
