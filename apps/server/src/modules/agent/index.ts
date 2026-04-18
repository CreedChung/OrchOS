import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { AgentService } from "@/modules/agent/service";
import { AgentModel } from "@/modules/agent/model";
import { S3Client } from "bun";

const s3 = new S3Client({
  accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  bucket: process.env.S3_BUCKET || "orchos-avatars",
});

export const agentController = new Elysia({ prefix: "/api/agents" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => AgentService.list(), {
    response: t.Array(AgentModel.response),
  })
  .post(
    "/",
    async ({ body }) => {
      const agent = AgentService.register({
        name: body.name,
        role: body.role,
        capabilities: body.capabilities as any[],
        status: "idle",
        model: body.model,
        enabled: true,
        cliCommand: body.cliCommand,
        runtimeId: body.runtimeId,
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
    ({ params: { id }, body }) => {
      const agent = AgentService.update(id, {
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
      const agent = AgentService.get(id);
      if (!agent) throw status(404, "Agent not found");

      const file = body.file;
      const key = `agents/${id}/${Date.now()}-${file.name}`;

      await s3.write(key, file, {
        type: file.type,
      });

      const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
      const bucket = process.env.S3_BUCKET || "orchos-avatars";
      const avatarUrl = `${endpoint}/${bucket}/${key}`;

      const updated = AgentService.updateAvatar(id, avatarUrl);
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
