import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { AgentService } from "./service";
import { AgentModel } from "./model";
import type { ObjectStorageAdapter } from "../../cloudflare/object-storage";

export type StorageAdapter = Pick<ObjectStorageAdapter, "write" | "getUrl">;

export function createAgentController(db: AppDb, storage?: StorageAdapter) {
  return new Elysia({ prefix: "/api/agents" })
    .get(
      "/",
      async () => {
        return await AgentService.list(db);
      },
      {
        response: t.Array(AgentModel.response),
      },
    )
    .post(
      "/",
      async ({ body }) => {
        const agent = await AgentService.register(db, {
          name: body.name,
          role: body.role,
          capabilities: body.capabilities as any[],
          status: "idle",
          model: body.model,
          enabled: true,
          cliCommand: body.cliCommand,
          runtimeId: body.runtimeId,
          avatarUrl: body.avatarUrl,
        });
        return agent;
      },
      {
        body: AgentModel.createBody,
        response: AgentModel.response,
      },
    )
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        const agent = await AgentService.update(db, id, {
          name: body.name,
          role: body.role,
          capabilities: body.capabilities as any[] | undefined,
          status: body.status,
          model: body.model,
          enabled: body.enabled,
          cliCommand: body.cliCommand,
          runtimeId: body.runtimeId,
          avatarUrl: body.avatarUrl,
        });
        if (!agent) throw status(404, "Agent not found");
        return agent;
      },
      {
        params: t.Object({ id: t.String() }),
        body: AgentModel.updateBody,
        response: {
          200: AgentModel.response,
          404: AgentModel.errorNotFound,
        },
      },
    )
    .post(
      "/:id/avatar",
      async ({ params: { id }, body }) => {
        const agent = await AgentService.get(db, id);
        if (!agent) throw status(404, "Agent not found");

        if (!storage) throw status(501, "Storage not configured");

        const file = body.file;
        const key = `agents/${id}/${Date.now()}-${file.name}`;

        await storage.write(key, file, { type: file.type });

        const avatarUrl = storage.getUrl(key);

        const updated = await AgentService.updateAvatar(db, id, avatarUrl);
        if (!updated) throw status(404, "Agent not found");
        return updated;
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          file: t.File(),
        }),
        response: AgentModel.response,
      },
    );
}
