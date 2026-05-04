import { Elysia, t } from "elysia";
import { status } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { SkillService } from "@/modules/skill/service";
import { SkillModel } from "@/modules/skill/model";

const skillMarketItem = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  source: t.String(),
  browseUrl: t.Optional(t.String()),
  installSource: t.Optional(t.String()),
  category: t.Optional(t.String()),
  installable: t.Boolean(),
  installed: t.Boolean(),
  owner: t.Optional(t.String()),
  repo: t.Optional(t.String()),
  stars: t.Optional(t.Number()),
  homepage: t.Optional(t.String()),
  lastUpdatedAt: t.Optional(t.String()),
  sourceType: t.Union([t.Literal("official")]),
  tags: t.Array(t.String()),
});

const AWESOME_OPENCLAW_SKILLS_URL =
  "https://raw.githubusercontent.com/VoltAgent/awesome-openclaw-skills/main/README.md";

async function enrichGithubRepositoryMetadata<T extends { source: string; browseUrl?: string }>(item: T) {
  const githubCandidate = item.browseUrl && /github\.com\//i.test(item.browseUrl) ? item.browseUrl : item.source;
  const match = /github\.com\/([^/]+)\/([^/#?]+)/i.exec(githubCandidate);
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

function buildMarketTags(category?: string) {
  const normalizedCategory = category?.trim().replace(/\s+/g, " ");

  return Array.from(new Set(["official", ...(normalizedCategory ? [normalizedCategory] : [])]));
}

function cleanMarkdownHeadingText(value: string) {
  return value.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
}

async function loadOfficialSkillMarket() {
  const response = await fetch(AWESOME_OPENCLAW_SKILLS_URL);
  if (!response.ok) {
    throw new Error(`Failed to load skill market: ${response.status}`);
  }

  const markdown = await response.text();
  const lines = markdown.split(/\r?\n/);
  const items: Array<{
    id: string;
    name: string;
    description: string;
    source: string;
    browseUrl?: string;
    installSource?: string;
    category?: string;
    installable: boolean;
    sourceType: "official";
      tags: string[];
      installed: boolean;
    }> = [];

  let currentCategory: string | undefined;
  for (const rawLine of lines) {
    const line = rawLine.trim();

    const categoryMatch = /^###\s+(.+)$/.exec(line);
    if (categoryMatch) {
      currentCategory = cleanMarkdownHeadingText(categoryMatch[1]);
      continue;
    }

    const itemMatch = /^-\s+\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s+-\s+(.+)$/.exec(line);
    if (!itemMatch) {
      continue;
    }

    const [, name, url, description] = itemMatch;
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const isGitHubInstallSource = /github\.com\/(openclaw|clawdbot)\/skills\/(?:tree|blob)\/main\//i.test(url);
    const installSource = isGitHubInstallSource
      ? url
          .replace(/\/blob\//, "/tree/")
          .replace(/\/SKILL\.md$/i, "")
      : undefined;
    const slugBase = installSource || url;
    const id = slugBase
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);

    const tags = buildMarketTags(currentCategory);

    items.push({
      id,
      name: normalizedName,
      description: normalizedDescription,
      source: installSource || url,
      browseUrl: url,
      installSource,
      category: currentCategory,
      installable: Boolean(installSource),
      installed: false,
      sourceType: "official",
      tags,
    });
  }

  return Promise.all(items.map((item) => enrichGithubRepositoryMetadata(item)));
}

async function getOfficialSkillMarketItem(id: string) {
  const installedSkills = SkillService.list();
  const installedSources = new Set(
    installedSkills
      .map((skill) => skill.sourceUrl?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  const installedNames = new Set(installedSkills.map((skill) => skill.name.trim().toLowerCase()));
  const allItems = await loadOfficialSkillMarket();

  return allItems
    .map((item) => {
      const normalizedInstallSource = item.installSource?.trim().toLowerCase();
      const normalizedSource = item.source.trim().toLowerCase();
      const normalizedName = item.name.trim().toLowerCase();
      const installed =
        (normalizedInstallSource ? installedSources.has(normalizedInstallSource) : false) ||
        installedSources.has(normalizedSource) ||
        installedNames.has(normalizedName);

      return {
        ...item,
        installed,
      };
    })
    .find((item) => item.id === id);
}

export const skillController = new Elysia({ prefix: "/api/skills" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/market",
    async ({ query }) => {
      const installedSkills = SkillService.list();
      const installedSources = new Set(
        installedSkills
          .map((skill) => skill.sourceUrl?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value)),
      );
      const installedNames = new Set(installedSkills.map((skill) => skill.name.trim().toLowerCase()));
      const allItems = (await loadOfficialSkillMarket()).map((item) => {
        const normalizedInstallSource = item.installSource?.trim().toLowerCase();
        const normalizedSource = item.source.trim().toLowerCase();
        const normalizedName = item.name.trim().toLowerCase();
        const installed =
          (normalizedInstallSource ? installedSources.has(normalizedInstallSource) : false) ||
          installedSources.has(normalizedSource) ||
          installedNames.has(normalizedName);

        return {
          ...item,
          installed,
        };
      });
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

        return [item.name, item.description, item.source, item.category, ...item.tags]
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
        items: t.Array(skillMarketItem),
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
      const item = await getOfficialSkillMarketItem(id);
      if (!item) throw status(404, "Skill market item not found");
      return item;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: skillMarketItem,
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .get(
    "/",
    ({ query }) => {
      return SkillService.list({
        projectId: query.projectId,
        organizationId: query.organizationId,
        scope: query.scope as "global" | "project" | undefined,
      });
    },
    {
      query: SkillModel.listQuery,
      response: t.Array(SkillModel.response),
    },
  )
  .get(
    "/:id",
    ({ params: { id } }) => {
      const skill = SkillService.get(id);
      if (!skill) throw status(404, "Skill not found");
      return skill;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: SkillModel.response,
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .post(
    "/",
    ({ body }) => {
      return SkillService.create({
        name: body.name,
        description: body.description,
        scope: body.scope,
        projectId: body.projectId,
        organizationId: body.organizationId,
        sourceType: body.sourceType,
        sourceUrl: body.sourceUrl,
        installPath: body.installPath,
        manifestPath: body.manifestPath,
      });
    },
    {
      body: SkillModel.createBody,
      response: SkillModel.response,
    },
  )
  .post(
    "/analyze-repository",
    async ({ body }) => {
      return SkillService.analyzeRepository({
        source: body.source,
        scope: body.scope,
        projectId: body.projectId,
        organizationId: body.organizationId,
      });
    },
    {
      body: SkillModel.analyzeRepositoryBody,
      response: SkillModel.analyzeRepositoryResponse,
    },
  )
  .post(
    "/install-repository",
    ({ body }) => {
      return SkillService.installFromAnalysis({
        analysisId: body.analysisId,
        selectedSkills: body.selectedSkills,
        allowHighRisk: body.allowHighRisk,
      });
    },
    {
      body: SkillModel.installRepositoryBody,
      response: SkillModel.installRepositoryResponse,
    },
  )
  .patch(
    "/:id",
    ({ params: { id }, body }) => {
      const skill = SkillService.update(id, {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        scope: body.scope,
        applicability: body.applicability,
      });
      if (!skill) throw status(404, "Skill not found");
      return skill;
    },
    {
      params: t.Object({ id: t.String() }),
      body: SkillModel.updateBody,
      response: {
        200: SkillModel.response,
        404: t.Object({ error: t.String() }),
      },
    },
  )
  .delete(
    "/:id",
    ({ params: { id } }) => {
      const deleted = SkillService.delete(id);
      if (!deleted) throw status(404, "Skill not found");
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
      const skill = SkillService.toggleEnabled(id, body.enabled);
      if (!skill) throw status(404, "Skill not found");
      return skill;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ enabled: t.Boolean() }),
      response: {
        200: SkillModel.response,
        404: t.Object({ error: t.String() }),
      },
    },
  );
