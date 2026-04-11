import { t, type UnwrapSchema } from "elysia"

export const GoalModel = {
  createBody: t.Object({
    title: t.String(),
    description: t.Optional(t.String()),
    successCriteria: t.Array(t.String()),
    constraints: t.Optional(t.Array(t.String())),
    projectId: t.Optional(t.String()),
  }),
  updateBody: t.Partial(
    t.Object({
      title: t.String(),
      description: t.String(),
      successCriteria: t.Array(t.String()),
      constraints: t.Array(t.String()),
      status: t.Union([t.Literal("active"), t.Literal("completed"), t.Literal("paused")]),
      projectId: t.String(),
    })
  ),
  response: t.Object({
    id: t.String(),
    title: t.String(),
    description: t.Optional(t.String()),
    successCriteria: t.Array(t.String()),
    constraints: t.Array(t.String()),
    status: t.Union([t.Literal("active"), t.Literal("completed"), t.Literal("paused")]),
    projectId: t.Optional(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
  errorNotFound: t.Object({ error: t.Literal("Goal not found") }),
  successDeleted: t.Object({ success: t.Literal(true) }),
} as const

export type GoalModel = {
  [k in keyof typeof GoalModel]: UnwrapSchema<typeof GoalModel[k]>
}
