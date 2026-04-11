import { t, type UnwrapSchema } from "elysia"

export const ProjectModel = {
  createBody: t.Object({
    name: t.String(),
    path: t.String(),
  }),
  updateBody: t.Partial(
    t.Object({
      name: t.String(),
      path: t.String(),
    })
  ),
  response: t.Object({
    id: t.String(),
    name: t.String(),
    path: t.String(),
    createdAt: t.String(),
  }),
  errorNotFound: t.Object({ error: t.Literal("Project not found") }),
  successDeleted: t.Object({ success: t.Literal(true) }),
} as const

export type ProjectModel = {
  [k in keyof typeof ProjectModel]: UnwrapSchema<typeof ProjectModel[k]>
}
