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
        throw status(400, "No valid fields to update");
      },
      {
        body: t.Object({
          status: t.Optional(t.Union([t.Literal("idle"), t.Literal("active"), t.Literal("error")])),
          enabled: t.Optional(t.Boolean()),
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
        body: RuntimeModel.chatBody,
        response: RuntimeModel.chatResponse,
      },
    );
}
