import { t, type UnwrapSchema } from "elysia"

export const SandboxModel = {
  createVMBody: t.Object({
    projectId: t.String(),
    agentType: t.Optional(t.Union([
      t.Literal("pi"),
      t.Literal("claude-code"),
      t.Literal("codex"),
      t.Literal("opencode"),
      t.Literal("amp"),
    ])),
    additionalInstructions: t.Optional(t.String()),
    readOnlyMount: t.Optional(t.Boolean({ description: "Mount project directory as read-only (default true)" })),
  }),

  vmResponse: t.Object({
    vmId: t.String(),
    projectId: t.String(),
    status: t.Union([t.Literal("creating"), t.Literal("running"), t.Literal("disposed"), t.Literal("error")]),
    agentType: t.String(),
    createdAt: t.String(),
  }),

  createSessionBody: t.Object({
    agentType: t.Optional(t.String()),
    cwd: t.Optional(t.String()),
    env: t.Optional(t.Record(t.String(), t.String())),
    additionalInstructions: t.Optional(t.String()),
    mcpServers: t.Optional(t.Array(t.Union([
      t.Object({
        type: t.Literal("local"),
        command: t.String(),
        args: t.Optional(t.Array(t.String())),
        env: t.Optional(t.Record(t.String(), t.String())),
      }),
      t.Object({
        type: t.Literal("remote"),
        url: t.String(),
        headers: t.Optional(t.Record(t.String(), t.String())),
      }),
    ]))),
  }),

  sessionResponse: t.Object({
    sessionId: t.String(),
    vmId: t.String(),
    agentType: t.String(),
    status: t.Union([t.Literal("active"), t.Literal("closed")]),
    createdAt: t.String(),
  }),

  promptBody: t.Object({
    text: t.String(),
  }),

  promptResponse: t.Object({
    sessionId: t.String(),
    text: t.String(),
    success: t.Boolean(),
  }),

  permissionBody: t.Object({
    permissionId: t.String(),
    reply: t.Union([t.Literal("once"), t.Literal("always"), t.Literal("reject")]),
  }),

  eventResponse: t.Object({
    sessionId: t.String(),
    events: t.Array(t.Object({
      sequenceNumber: t.Number(),
      method: t.String(),
      params: t.Any(),
    })),
  }),

  configBody: t.Object({
    model: t.Optional(t.String()),
    mode: t.Optional(t.String()),
    thoughtLevel: t.Optional(t.String()),
  }),

  listVMsResponse: t.Array(t.Object({
    vmId: t.String(),
    projectId: t.String(),
    status: t.String(),
    agentType: t.String(),
    sessions: t.Number(),
    createdAt: t.String(),
  })),
} as const

export type SandboxModel = {
  [k in keyof typeof SandboxModel]: UnwrapSchema<typeof SandboxModel[k]>
}
