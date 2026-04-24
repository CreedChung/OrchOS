import { Elysia, t } from "elysia";
import { status } from "elysia";
import type { AppDb } from "../../db/types";
import { McpServerService } from "./service";
import { McpServerModel } from "./model";

const mcpMarketItem = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  command: t.String(),
  args: t.Array(t.String()),
  sourceType: t.Union([t.Literal("official")]),
  tags: t.Array(t.String()),
});

const officialMcpMarket = [
  {
    id: "filesystem",
    name: "Filesystem MCP",
    description: "Official filesystem access server for repository and workspace operations.",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/root/project/OrchOS"],
    sourceType: "official" as const,
    tags: ["official", "filesystem"],
  },
  {
    id: "github",
    name: "GitHub MCP",
    description: "Official GitHub MCP server for repositories, pull requests, and issues.",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    sourceType: "official" as const,
    tags: ["official", "github"],
  },
  {
    id: "fetch",
    name: "Fetch MCP",
    description: "Official fetch server for safe remote document and API retrieval.",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    sourceType: "official" as const,
    tags: ["official", "network"],
  },
];

export function createMcpController(db: AppDb) {
  return new Elysia({ prefix: "/api/mcp-servers" })
    .get(
      "/market",
      () => officialMcpMarket,
      {
        response: t.Array(mcpMarketItem),
      },
    )
    .get(
      "/",
      ({ query }) => {
        return McpServerService.list(db, {
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
        return McpServerService.listGlobal(db);
      },
      {
        response: t.Array(McpServerModel.response),
      },
    )
    .get(
      "/project/:projectId",
      ({ params: { projectId } }) => {
        return McpServerService.listByProject(db, projectId);
      },
      {
        params: t.Object({ projectId: t.String() }),
        response: t.Array(McpServerModel.response),
      },
    )
    .get(
      "/:id",
      async ({ params: { id } }) => {
        const server = await McpServerService.get(db, id);
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
        return McpServerService.create(db, {
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
      async ({ params: { id }, body }) => {
        const server = await McpServerService.update(db, id, {
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
      async ({ params: { id } }) => {
        const deleted = await McpServerService.delete(db, id);
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
      async ({ params: { id }, body }) => {
        const server = await McpServerService.toggleEnabled(db, id, body.enabled);
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
      async ({ params: { id } }) => {
        const server = await McpServerService.get(db, id);
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
}
