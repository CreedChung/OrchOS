import { t, type UnwrapSchema } from "elysia";

export const ExecutionModel = {
  actionBody: t.Object({
    action: t.Union([
      t.Literal("write_code"),
      t.Literal("run_tests"),
      t.Literal("fix_bug"),
      t.Literal("commit"),
      t.Literal("review"),
    ]),
    stateId: t.Optional(t.String()),
    agentId: t.Optional(t.String()),
  }),
  actionResponse: t.Object({
    success: t.Boolean(),
    message: t.String(),
  }),
  settingsResponse: t.Object({
    autoCommit: t.Boolean(),
    autoFix: t.Boolean(),
    modelStrategy: t.Union([
      t.Literal("local-first"),
      t.Literal("cloud-first"),
      t.Literal("adaptive"),
    ]),
    locale: t.String(),
    timezone: t.String(),
    defaultRuntimeId: t.Optional(t.String()),
    notifications: t.Object({
      system: t.Boolean(),
      sound: t.Boolean(),
      eventSounds: t.Record(t.String(), t.Boolean()),
      eventSoundFiles: t.Record(t.String(), t.String()),
    }),
  }),
  settingsUpdateBody: t.Partial(
    t.Object({
      autoCommit: t.Boolean(),
      autoFix: t.Boolean(),
      modelStrategy: t.Union([
        t.Literal("local-first"),
        t.Literal("cloud-first"),
        t.Literal("adaptive"),
      ]),
      locale: t.String(),
      timezone: t.String(),
      defaultRuntimeId: t.String(),
      notifications: t.Object({
        system: t.Boolean(),
        sound: t.Boolean(),
        eventSounds: t.Record(t.String(), t.Boolean()),
        eventSoundFiles: t.Record(t.String(), t.String()),
      }),
    }),
  ),
  loopResponse: t.Object({ success: t.Literal(true) }),
} as const;

export type ExecutionModel = {
  [k in keyof typeof ExecutionModel]: UnwrapSchema<(typeof ExecutionModel)[k]>;
};
