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
  detectResponse: t.Object({
    available: t.Array(t.Object({
      id: t.String(),
      name: t.String(),
      command: t.String(),
      version: t.Optional(t.String()),
      path: t.Optional(t.String()),
      role: t.String(),
      capabilities: t.Array(t.String()),
      model: t.String(),
    })),
    unavailable: t.Array(t.Object({
      id: t.String(),
      name: t.String(),
      command: t.String(),
      role: t.String(),
      capabilities: t.Array(t.String()),
      model: t.String(),
    })),
  }),
  healthResponse: t.Object({
    healthy: t.Boolean(),
    level: t.Union([t.Literal("basic"), t.Literal("ping"), t.Literal("full")]),
    output: t.String(),
    error: t.Optional(t.String()),
    responseTime: t.Number(),
    agentName: t.String(),
    agentCommand: t.String(),
    authRequired: t.Optional(t.Boolean()),
  }),
  modelResponse: t.Object({
    model: t.Optional(t.String()),
    source: t.Union([t.Literal("cli"), t.Literal("config"), t.Literal("registry")]),
    rawOutput: t.Optional(t.String()),
  }),
} as const

export type AgentModel = {
  [k in keyof typeof AgentModel]: UnwrapSchema<typeof AgentModel[k]>
}
