import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { SandboxService } from "@/modules/sandbox/service";
import { SandboxModel } from "@/modules/sandbox/model";

export const sandboxController = new Elysia({ prefix: "/api/sandbox" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)

  // --- VM Management ---

  .post(
    "/vms",
    async ({ body }) => {
      const instance = await SandboxService.createVM({
        projectId: body.projectId,
        agentType: body.agentType,
        additionalInstructions: body.additionalInstructions,
        readOnlyMount: body.readOnlyMount,
      });
      return {
        vmId: instance.vmId,
        projectId: instance.projectId,
        status: instance.status,
        agentType: instance.agentType,
        createdAt: instance.createdAt,
      };
    },
    {
      body: SandboxModel.createVMBody,
      response: SandboxModel.vmResponse,
    },
  )

  .get("/vms", () => SandboxService.listVMs(), {
    response: SandboxModel.listVMsResponse,
  })

  .get(
    "/vms/:vmId",
    ({ params: { vmId } }) => {
      const instance = SandboxService.getVM(vmId);
      if (!instance) throw status(404, "VM not found");
      return {
        vmId: instance.vmId,
        projectId: instance.projectId,
        status: instance.status,
        agentType: instance.agentType,
        createdAt: instance.createdAt,
      };
    },
    {
      params: t.Object({ vmId: t.String() }),
      response: {
        200: SandboxModel.vmResponse,
        404: t.Object({ error: t.String() }),
      },
    },
  )

  .delete(
    "/vms/:vmId",
    async ({ params: { vmId } }) => {
      const deleted = await SandboxService.disposeVM(vmId);
      if (!deleted) throw status(404, "VM not found");
      return { success: true };
    },
    {
      params: t.Object({ vmId: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: t.Object({ error: t.String() }),
      },
    },
  )

  // --- VM File Operations ---

  .post(
    "/vms/:vmId/files/read",
    async ({ params: { vmId }, body }) => {
      const content = await SandboxService.readFile(vmId, body.path);
      return { path: body.path, content };
    },
    {
      params: t.Object({ vmId: t.String() }),
      body: t.Object({ path: t.String() }),
      response: t.Object({ path: t.String(), content: t.String() }),
    },
  )

  .post(
    "/vms/:vmId/files/write",
    async ({ params: { vmId }, body }) => {
      await SandboxService.writeFile(vmId, body.path, body.content);
      return { success: true };
    },
    {
      params: t.Object({ vmId: t.String() }),
      body: t.Object({ path: t.String(), content: t.String() }),
      response: t.Object({ success: t.Boolean() }),
    },
  )

  .post(
    "/vms/:vmId/exec",
    async ({ params: { vmId }, body }) => {
      const result = await SandboxService.execInVM(vmId, body.command);
      return result;
    },
    {
      params: t.Object({ vmId: t.String() }),
      body: t.Object({ command: t.String() }),
      response: t.Object({ success: t.Boolean(), output: t.String(), exitCode: t.Number() }),
    },
  )

  // --- Session Management ---

  .post(
    "/vms/:vmId/sessions",
    async ({ params: { vmId }, body }) => {
      const result = await SandboxService.createSession(vmId, {
        agentType: body.agentType,
        cwd: body.cwd,
        env: body.env,
        additionalInstructions: body.additionalInstructions,
        mcpServers: body.mcpServers as any,
      });
      return {
        sessionId: result.sessionId,
        vmId,
        agentType: result.agentType,
        status: "active",
        createdAt: new Date().toISOString(),
      };
    },
    {
      params: t.Object({ vmId: t.String() }),
      body: SandboxModel.createSessionBody,
      response: SandboxModel.sessionResponse,
    },
  )

  .get(
    "/vms/:vmId/sessions",
    ({ params: { vmId } }) => {
      const instance = SandboxService.getVM(vmId);
      if (!instance) throw status(404, "VM not found");
      return Array.from(instance.sessions.values());
    },
    {
      params: t.Object({ vmId: t.String() }),
      response: t.Array(
        t.Object({
          sessionId: t.String(),
          agentType: t.String(),
          status: t.String(),
          createdAt: t.String(),
        }),
      ),
    },
  )

  .post(
    "/sessions/:sessionId/prompt",
    async ({ params: { sessionId }, body }) => {
      return SandboxService.sendPrompt(sessionId, body.text);
    },
    {
      params: t.Object({ sessionId: t.String() }),
      body: SandboxModel.promptBody,
      response: SandboxModel.promptResponse,
    },
  )

  .post(
    "/sessions/:sessionId/cancel",
    async ({ params: { sessionId } }) => {
      const success = await SandboxService.cancelPrompt(sessionId);
      return { success };
    },
    {
      params: t.Object({ sessionId: t.String() }),
      response: t.Object({ success: t.Boolean() }),
    },
  )

  .get(
    "/sessions/:sessionId/events",
    ({ params: { sessionId }, query }) => {
      const events = SandboxService.getSessionEvents(sessionId, query.since);
      return { sessionId, events };
    },
    {
      params: t.Object({ sessionId: t.String() }),
      query: t.Object({ since: t.Optional(t.Number()) }),
      response: SandboxModel.eventResponse,
    },
  )

  .delete(
    "/sessions/:sessionId",
    ({ params: { sessionId } }) => {
      SandboxService.closeSession(sessionId);
      return { success: true };
    },
    {
      params: t.Object({ sessionId: t.String() }),
      response: t.Object({ success: t.Boolean() }),
    },
  )

  // --- Permissions ---

  .patch(
    "/sessions/:sessionId/permissions",
    async ({ params: { sessionId }, body }) => {
      await SandboxService.respondPermission(sessionId, body.permissionId, body.reply);
      return { success: true };
    },
    {
      params: t.Object({ sessionId: t.String() }),
      body: SandboxModel.permissionBody,
      response: t.Object({ success: t.Boolean() }),
    },
  )

  // --- Session Config ---

  .patch(
    "/sessions/:sessionId/config",
    async ({ params: { sessionId }, body }) => {
      if (body.model) await SandboxService.setSessionModel(sessionId, body.model);
      if (body.mode) await SandboxService.setSessionMode(sessionId, body.mode);
      if (body.thoughtLevel)
        await SandboxService.setSessionThoughtLevel(sessionId, body.thoughtLevel);
      return { success: true };
    },
    {
      params: t.Object({ sessionId: t.String() }),
      body: SandboxModel.configBody,
      response: t.Object({ success: t.Boolean() }),
    },
  );
