import { Elysia, t } from "elysia";
import { status } from "elysia";
import { McpServerService } from "./service";
import { McpServerModel } from "./model";

export const mcpController = new Elysia({ prefix: "/api/mcp-servers" })
  .requireAuth(true)
  .get(
    "/",
    ({ query }) => {
      return McpServerService.list({
        projectId: query.projectId,
        organizationId: query.organizationId,
        scope: query.scope as "global" | "project" | undefined,
      });
    },
    {
      query: McpServerModel.listQuery,
      response: t.Array(McpServerModel.response),
    },
  )
  .get(
    "/global",
    () => {
      return McpServerService.listGlobal();
    },
    {
      response: t.Array(McpServerModel.response),
    },
  )
  .get(
    "/project/:projectId",
    ({ params: { projectId } }) => {
      return McpServerService.listByProject(projectId);
    },
    {
      params: t.Object({ projectId: t.String() }),
      response: t.Array(McpServerModel.response),
    },
  )
  .get(
    "/:id",
    ({ params: { id } }) => {
      const server = McpServerService.get(id);
      if (!server) throw status(404, "MCP server not found");
      return server;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: McpServerModel.response,
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    "/",
    ({ body }) => {
      return McpServerService.create({
        name: body.name,
        command: body.command,
        args: body.args,
        env: body.env,
        scope: body.scope,
        projectId: body.projectId,
        organizationId: body.organizationId,
      });
    },
    {
      body: McpServerModel.createBody,
      response: McpServerModel.response,
    },
  )
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const server = McpServerService.update(id, {
        name: body.name,
        command: body.command,
        args: body.args,
        env: body.env,
        enabled: body.enabled,
        scope: body.scope,
      });
      if (!server) throw status(404, "MCP server not found");
      return server;
    },
    {
      params: t.Object({ id: t.String() }),
      body: McpServerModel.updateBody,
      response: {
        200: McpServerModel.response,
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .delete(
    "/:id",
    ({ params: { id } }) => {
      const deleted = McpServerService.delete(id);
      if (!deleted) throw status(404, "MCP server not found");
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    "/:id/toggle",
    ({ params: { id }, body }) => {
      const server = McpServerService.toggleEnabled(id, body.enabled);
      if (!server) throw status(404, "MCP server not found");
      return server;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ enabled: t.Boolean() }),
      response: {
        200: McpServerModel.response,
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .get(
    "/:id/status",
    ({ params: { id } }) => {
      const server = McpServerService.get(id);
      if (!server) throw status(404, "MCP server not found");
      return { id, running: McpServerService.isProcessRunning(id), enabled: server.enabled };
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Object({
        id: t.String(),
        running: t.Boolean(),
        enabled: t.Boolean(),
      }),
    },
  );
