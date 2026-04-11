import { t, type UnwrapSchema } from "elysia"

export const ActivityModel = {
  response: t.Object({
    id: t.String(),
    goalId: t.String(),
    timestamp: t.String(),
    agent: t.String(),
    action: t.String(),
    detail: t.Optional(t.String()),
    reasoning: t.Optional(t.String()),
  }),
} as const

export type ActivityModel = {
  [k in keyof typeof ActivityModel]: UnwrapSchema<typeof ActivityModel[k]>
}
