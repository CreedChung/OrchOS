import { t, type UnwrapSchema } from "elysia"

export const AgentModel = {
  updateBody: t.Object({
    status: t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")]),
  }),
  response: t.Object({
    id: t.String(),
    name: t.String(),
    role: t.String(),
    capabilities: t.Array(t.String()),
    status: t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")]),
    model: t.String(),
  }),
  errorNotFound: t.Object({ error: t.Literal("Agent not found") }),
} as const

export type AgentModel = {
  [k in keyof typeof AgentModel]: UnwrapSchema<typeof AgentModel[k]>
}
