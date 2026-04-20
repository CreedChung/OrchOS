import { t, type UnwrapSchema } from "elysia";

export const RuntimeModel = {
  response: t.Object({
    id: t.String(),
    name: t.String(),
    command: t.String(),
    version: t.Optional(t.String()),
    path: t.Optional(t.String()),
    role: t.String(),
    capabilities: t.Array(t.String()),
    model: t.String(),
    protocol: t.Union([t.Literal("acp"), t.Literal("cli")]),
    transport: t.Union([t.Literal("stdio"), t.Literal("tcp")]),
    acpCommand: t.Optional(t.String()),
    acpArgs: t.Array(t.String()),
    acpEnv: t.Record(t.String(), t.String()),
    communicationMode: t.Union([
      t.Literal("acp-native"),
      t.Literal("acp-adapter"),
      t.Literal("cli-fallback"),
    ]),
    enabled: t.Boolean(),
    currentModel: t.Optional(t.String()),
    status: t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")]),
    registryId: t.Optional(t.String()),
  }),
  detectResponse: t.Object({
    available: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        command: t.String(),
        version: t.Optional(t.String()),
        path: t.Optional(t.String()),
        role: t.String(),
        capabilities: t.Array(t.String()),
        model: t.String(),
        protocol: t.Union([t.Literal("acp"), t.Literal("cli")]),
        transport: t.Union([t.Literal("stdio"), t.Literal("tcp")]),
        acpCommand: t.Optional(t.String()),
        acpArgs: t.Array(t.String()),
        acpEnv: t.Record(t.String(), t.String()),
        communicationMode: t.Union([
          t.Literal("acp-native"),
          t.Literal("acp-adapter"),
          t.Literal("cli-fallback"),
        ]),
        error: t.Optional(t.String()),
      }),
    ),
    unavailable: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        command: t.String(),
        role: t.String(),
        capabilities: t.Array(t.String()),
        model: t.String(),
        protocol: t.Union([t.Literal("acp"), t.Literal("cli")]),
        transport: t.Union([t.Literal("stdio"), t.Literal("tcp")]),
        acpCommand: t.Optional(t.String()),
        acpArgs: t.Array(t.String()),
        acpEnv: t.Record(t.String(), t.String()),
        communicationMode: t.Union([
          t.Literal("acp-native"),
          t.Literal("acp-adapter"),
          t.Literal("cli-fallback"),
        ]),
        error: t.Optional(t.String()),
      }),
    ),
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
    source: t.Union([
      t.Literal("acp"),
      t.Literal("cli"),
      t.Literal("config"),
      t.Literal("registry"),
    ]),
    rawOutput: t.Optional(t.String()),
  }),
  modelsResponse: t.Object({
    models: t.Array(t.String()),
    currentModel: t.Optional(t.String()),
    source: t.Union([t.Literal("acp"), t.Literal("config")]),
    rawOutput: t.Optional(t.String()),
  }),
  chatBody: t.Object({
    prompt: t.String(),
  }),
  chatResponse: t.Object({
    success: t.Boolean(),
    output: t.String(),
    error: t.Optional(t.String()),
    agentName: t.String(),
    responseTime: t.Number(),
  }),
} as const;

export type RuntimeModel = {
  [k in keyof typeof RuntimeModel]: UnwrapSchema<(typeof RuntimeModel)[k]>;
};
