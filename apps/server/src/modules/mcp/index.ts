import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { McpServerService } from "@/modules/mcp/service";
import { McpServerModel } from "@/modules/mcp/model";

const mcpMarketItem = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  command: t.String(),
  args: t.Array(t.String()),
  source: t.String(),
  category: t.Optional(t.String()),
  installed: t.Boolean(),
  owner: t.Optional(t.String()),
  repo: t.Optional(t.String()),
  stars: t.Optional(t.Number()),
  homepage: t.Optional(t.String()),
  lastUpdatedAt: t.Optional(t.String()),
  sourceType: t.Union([t.Literal("official")]),
  tags: t.Array(t.String()),
});

const AWESOME_MCP_SERVERS_URL =
  "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md";

async function enrichGithubRepositoryMetadata<T extends { source: string }>(item: T) {
  const match = /github\.com\/([^/]+)\/([^/#?]+)/i.exec(item.source);
  if (!match) return item;

  const [, owner, repoWithGit] = match;
  const repo = repoWithGit.replace(/\.git$/i, "");

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) {
      return { ...item, owner, repo };
    }

    const data = await response.json() as {
      stargazers_count?: number;
      homepage?: string | null;
      pushed_at?: string | null;
    };

    return {
      ...item,
      owner,
      repo,
      stars: typeof data.stargazers_count === "number" ? data.stargazers_count : undefined,
      homepage: data.homepage || undefined,
      lastUpdatedAt: data.pushed_at || undefined,
    };
  } catch {
    return { ...item, owner, repo };
  }
}

function inferMcpCommand(source: string) {
  const lowered = source.toLowerCase();
  const repoName = source.split("/").filter(Boolean).pop() || "mcp-server";

  if (lowered.includes("/tree/") || lowered.includes("/blob/")) {
    return { command: "git", args: ["clone", source] };
  }

  if (lowered.includes("typescript") || lowered.includes("javascript") || lowered.includes("📇")) {
    return { command: "npx", args: ["-y", repoName] };
  }

  if (lowered.includes("python") || lowered.includes("🐍")) {
    return { command: "uvx", args: [repoName] };
  }

  return { command: "git", args: ["clone", source] };
}

async function loadOfficialMcpMarket() {
  const response = await fetch(AWESOME_MCP_SERVERS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load MCP market: ${response.status}`);
  }

  const markdown = await response.text();
  const lines = markdown.split(/\r?\n/);
  const items: Array<{
    id: string;
    name: string;
    description: string;
    command: string;
    args: string[];
    source: string;
    category?: string;
    installed: boolean;
    sourceType: "official";
    tags: string[];
  }> = [];

  let currentCategory: string | undefined;
  for (const rawLine of lines) {
    const line = rawLine.trim();

    const categoryMatch = /^###\s+(?:[^<]+<a[^>]*><\/a>)?(.+)$/.exec(line);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      continue;
    }

    const itemMatch = /^-\s+\[([^\]]+)\]\((https?:\/\/github\.com\/[^)]+)\)(?:\s+[^-]*)?\s+-\s+(.+)$/.exec(line);
    if (!itemMatch) {
      continue;
    }

    const [, name, source, description] = itemMatch;
    const inferred = inferMcpCommand(source);
    const id = source
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
    const tags = Array.from(
      new Set([
        "official",
        ...(currentCategory
          ? currentCategory
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .filter(Boolean)
          : []),
      ]),
    );

    items.push({
      id,
      name: name.trim(),
      description: description.trim(),
      command: inferred.command,
      args: inferred.args,
      source,
      category: currentCategory,
      installed: false,
      sourceType: "official",
      tags,
    });
  }

  return Promise.all(items.map((item) => enrichGithubRepositoryMetadata(item)));
}

async function getOfficialMcpMarketItem(id: string) {
  const installedServers = McpServerService.list();
  const installedKeys = new Set(
    installedServers.map((server) => `${server.command}::${server.args.join(" ")}`.toLowerCase()),
  );
  const installedNames = new Set(installedServers.map((server) => server.name.trim().toLowerCase()));
  const allItems = await loadOfficialMcpMarket();

  return allItems
    .map((item) => ({
      ...item,
      installed:
        installedKeys.has(`${item.command}::${item.args.join(" ")}`.toLowerCase()) ||
        installedNames.has(item.name.trim().toLowerCase()),
    }))
    .find((item) => item.id === id);
}

export const mcpController = new Elysia({ prefix: "/api/mcp-servers" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/market",
    async ({ query }) => {
      const installedServers = McpServerService.list();
      const installedKeys = new Set(
        installedServers.map((server) => `${server.command}::${server.args.join(" ")}`.toLowerCase()),
      );
      const installedNames = new Set(installedServers.map((server) => server.name.trim().toLowerCase()));
      const allItems = (await loadOfficialMcpMarket()).map((item) => ({
        ...item,
        installed:
          installedKeys.has(`${item.command}::${item.args.join(" ")}`.toLowerCase()) ||
          installedNames.has(item.name.trim().toLowerCase()),
      }));
      const page = Math.max(1, Number(query.page || 1));
      const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 30)));
      const search = String(query.search || "").trim().toLowerCase();
      const filter = query.filter || "all";
      const tag = query.tag || "all";

      const filtered = allItems.filter((item) => {
        if (filter === "official" && item.sourceType !== "official") return false;
        if (filter === "installed" && !item.installed) return false;
        if (tag !== "all" && !item.tags.includes(tag)) return false;
        if (!search) return true;

        return [item.name, item.description, item.command, item.source, item.category, ...item.args, ...item.tags]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const currentPage = Math.min(page, totalPages);
      const start = (currentPage - 1) * pageSize;
      const tags = Array.from(new Set(allItems.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b));

      return {
        items: filtered.slice(start, start + pageSize),
        tags,
        page: currentPage,
        pageSize,
        total,
        totalPages,
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        search: t.Optional(t.String()),
        filter: t.Optional(t.Union([t.Literal("all"), t.Literal("official"), t.Literal("installed")])),
        tag: t.Optional(t.String()),
      }),
      response: t.Object({
        items: t.Array(mcpMarketItem),
        tags: t.Array(t.String()),
        page: t.Number(),
        pageSize: t.Number(),
        total: t.Number(),
        totalPages: t.Number(),
      }),
    },
  )
  .get(
    "/market/:id",
    async ({ params: { id } }) => {
      const item = await getOfficialMcpMarketItem(id);
      if (!item) throw status(404, "MCP market item not found");
      return item;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: mcpMarketItem,
        404: t.Object({ error: t.String() }),
      },
    },
  )
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
