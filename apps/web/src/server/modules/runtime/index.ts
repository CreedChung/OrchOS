import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { RuntimeService } from "./service";
import { RuntimeModel } from "./model";

export function createRuntimeController(db: AppDb) {
  return new Elysia({ prefix: "/api/runtimes" })
    .get(
      "/",
      async () => {
        return await RuntimeService.list(db);
      },
      {
        response: t.Array(RuntimeModel.response),
      },
    )
    .get(
      "/detect",
      async () => {
        return RuntimeService.detect();
      },
      {
        response: RuntimeModel.detectResponse,
      },
    )
    .post(
      "/detect/register",
      async ({ body }) => {
        const detected = await RuntimeService.detect();
        const registered: RuntimeModel["response"][] = [];
        const skipped: {
          id: string;
          name: string;
          command: string;
          version?: string;
          path?: string;
          role: string;
          capabilities: string[];
          model: string;
        }[] = [];

        for (const runtime of detected.available) {
          if ((body.runtimeIds && body.runtimeIds.includes(runtime.id)) || body.registerAll) {
            const existing = await RuntimeService.getByName(db, runtime.name);
            if (existing) {
              skipped.push(runtime);
            } else {
              const profile = await RuntimeService.registerFromDetection(db, runtime);
              if (profile) registered.push(profile);
            }
          }
        }

        return { registered, skipped };
      },
      {
        body: t.Object({
          runtimeIds: t.Optional(t.Array(t.String())),
          registerAll: t.Optional(t.Boolean()),
        }),
        response: t.Object({
          registered: t.Array(RuntimeModel.response),
          skipped: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              command: t.String(),
              version: t.Optional(t.String()),
              path: t.Optional(t.String()),
              role: t.String(),
              capabilities: t.Array(t.String()),
              model: t.String(),
            }),
          ),
        }),
      },
    )
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        if (body.status !== undefined) {
          const runtime = await RuntimeService.updateStatus(db, id, body.status);
          if (!runtime) throw status(404, "Runtime not found");
          return runtime;
        }
        if (body.enabled !== undefined) {
          const runtime = await RuntimeService.updateEnabled(db, id, body.enabled);
          if (!runtime) throw status(404, "Runtime not found");
          return runtime;
        }
        if (
          body.protocol !== undefined ||
          body.transport !== undefined ||
          body.acpCommand !== undefined ||
          body.acpArgs !== undefined ||
          body.acpEnv !== undefined ||
          body.communicationMode !== undefined
        ) {
          const runtime = await RuntimeService.updateConfig(db, id, body);
          if (!runtime) throw status(404, "Runtime not found");
          return runtime;
        }
        throw status(400, "No valid fields to update");
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          status: t.Optional(t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")])),
          enabled: t.Optional(t.Boolean()),
          protocol: t.Optional(t.Union([t.Literal("acp"), t.Literal("cli")])),
          transport: t.Optional(t.Union([t.Literal("stdio"), t.Literal("tcp")])),
          acpCommand: t.Optional(t.String()),
          acpArgs: t.Optional(t.Array(t.String())),
          acpEnv: t.Optional(t.Record(t.String(), t.String())),
          communicationMode: t.Optional(
            t.Union([
              t.Literal("acp-native"),
              t.Literal("acp-adapter"),
              t.Literal("cli-fallback"),
            ]),
          ),
        }),
        response: {
          200: RuntimeModel.response,
          404: t.Object({ error: t.String() }),
        },
      },
    )
    .get(
      "/:runtimeId/health",
      async ({ params: { runtimeId }, query }) => {
        const result = await RuntimeService.healthCheck(runtimeId, {
          level: (query.level as "basic" | "ping" | "full") || "basic",
          prompt: query.prompt,
        });
        if (!result.healthy && result.error?.includes("not found in PATH")) {
          throw status(404, `Runtime CLI '${runtimeId}' not found`);
        }
        return result;
      },
      {
        params: t.Object({ runtimeId: t.String() }),
        query: t.Object({
          level: t.Optional(t.Union([t.Literal("basic"), t.Literal("ping"), t.Literal("full")])),
          prompt: t.Optional(t.String()),
        }),
        response: {
          200: RuntimeModel.healthResponse,
          404: t.Object({ error: t.String() }),
        },
      },
    )
    .get(
      "/:runtimeId/model",
      async ({ params: { runtimeId } }) => {
        return await RuntimeService.getCurrentModel(db, runtimeId);
      },
      {
        params: t.Object({ runtimeId: t.String() }),
        response: RuntimeModel.modelResponse,
      },
    )
    .post(
      "/:runtimeId/chat",
      async ({ params: { runtimeId }, body }) => {
        const result = await RuntimeService.chat(db, runtimeId, body.prompt);
        if (!result.success && result.error?.includes("not found")) {
          throw status(404, result.error);
        }
        return result;
      },
      {
        params: t.Object({ runtimeId: t.String() }),
        body: RuntimeModel.chatBody,
        response: RuntimeModel.chatResponse,
      },
    );
}
