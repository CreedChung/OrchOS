import { t, type UnwrapSchema } from "elysia"

export const AgentModel = {
  createBody: t.Object({
    name: t.String(),
    role: t.String(),
    capabilities: t.Array(t.String()),
    model: t.String(),
    cliCommand: t.Optional(t.String()),
    runtimeId: t.Optional(t.String()),
  }),
  updateBody: t.Object({
    status: t.Optional(t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")])),
    enabled: t.Optional(t.Boolean()),
  }),
  response: t.Object({
    id: t.String(),
    name: t.String(),
    role: t.String(),
    capabilities: t.Array(t.String()),
    status: t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")]),
    model: t.String(),
    enabled: t.Boolean(),
    cliCommand: t.Optional(t.String()),
    currentModel: t.Optional(t.String()),
    runtimeId: t.Optional(t.String()),
  }),
  errorNotFound: t.Object({ error: t.Literal("Agent not found") }),
} as const

export type AgentModel = {
  [k in keyof typeof AgentModel]: UnwrapSchema<typeof AgentModel[k]>
}
