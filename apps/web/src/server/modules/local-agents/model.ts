import { t, type UnwrapSchema } from "elysia";

const RuntimeDetectionModel = t.Object({
  id: t.String(),
  name: t.String(),
  command: t.String(),
  version: t.Optional(t.String()),
  path: t.Optional(t.String()),
  role: t.String(),
  capabilities: t.Array(t.String()),
  model: t.String(),
  transport: t.Union([t.Literal("stdio"), t.Literal("tcp")]),
  error: t.Optional(t.String()),
});

export const LocalAgentModel = {
  runtime: RuntimeDetectionModel,
  response: t.Object({
    id: t.String(),
    userId: t.String(),
    organizationId: t.Optional(t.String()),
    deviceId: t.String(),
    name: t.String(),
    platform: t.Optional(t.String()),
    appVersion: t.Optional(t.String()),
    status: t.Union([t.Literal("online"), t.Literal("offline")]),
    runtimes: t.Array(RuntimeDetectionModel),
    metadata: t.Record(t.String(), t.String()),
    registeredAt: t.String(),
    lastSeenAt: t.String(),
  }),
  heartbeatBody: t.Object({
    deviceId: t.String(),
    name: t.String(),
    platform: t.Optional(t.String()),
    appVersion: t.Optional(t.String()),
    runtimes: t.Array(RuntimeDetectionModel),
    metadata: t.Optional(t.Record(t.String(), t.String())),
  }),
  pairingResponse: t.Object({
    pairingToken: t.String(),
    expiresAt: t.String(),
  }),
  pairBody: t.Object({
    pairingToken: t.String(),
    deviceId: t.String(),
    name: t.String(),
    platform: t.Optional(t.String()),
    appVersion: t.Optional(t.String()),
    metadata: t.Optional(t.Record(t.String(), t.String())),
  }),
  pairResponse: t.Object({
    hostToken: t.String(),
    host: t.Object({
      id: t.String(),
      userId: t.String(),
      organizationId: t.Optional(t.String()),
      deviceId: t.String(),
      name: t.String(),
      platform: t.Optional(t.String()),
      appVersion: t.Optional(t.String()),
      status: t.Union([t.Literal("online"), t.Literal("offline")]),
      runtimes: t.Array(RuntimeDetectionModel),
      metadata: t.Record(t.String(), t.String()),
      registeredAt: t.String(),
      lastSeenAt: t.String(),
    }),
  }),
} as const;

export type LocalAgentModel = {
  [k in keyof typeof LocalAgentModel]: UnwrapSchema<(typeof LocalAgentModel)[k]>;
};
