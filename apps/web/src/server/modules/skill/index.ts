import { Elysia, t } from "elysia";
import { status } from "elysia";
import { SkillService } from "./service";
import { SkillModel } from "./model";
import type { AppDb } from "../../db/types";

const skillMarketItem = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.String(),
  source: t.String(),
  sourceType: t.Union([t.Literal("official")]),
  tags: t.Array(t.String()),
});

const officialSkillMarket = [
  {
    id: "github-automation",
    name: "GitHub Automation",
    description: "Install GitHub issue, PR, and review automation skills from the official repository.",
    source: "https://github.com/orchos/skill-market-github",
    sourceType: "official" as const,
    tags: ["github", "automation", "official"],
  },
  {
    id: "repo-analysis",
    name: "Repository Analysis",
    description: "Adds repository inspection and architecture analysis skills for onboarding and planning.",
    source: "https://github.com/orchos/skill-market-analysis",
    sourceType: "official" as const,
    tags: ["analysis", "planning", "official"],
  },
  {
    id: "quality-gates",
    name: "Quality Gates",
    description: "Provides reusable skills for lint, test, and verification workflows.",
    source: "https://github.com/orchos/skill-market-quality",
    sourceType: "official" as const,
    tags: ["quality", "ci", "official"],
  },
];

export function createSkillController(db: AppDb) {
  return new Elysia({ prefix: "/api/skills" })
    .get(
      "/market",
      () => officialSkillMarket,
      {
        response: t.Array(skillMarketItem),
      },
    )
    .get(
      "/",
      ({ query }) =>
        SkillService.list(db, {
          projectId: query.projectId,
          organizationId: query.organizationId,
          scope: query.scope as "global" | "project" | undefined,
        }),
      {
        query: SkillModel.listQuery,
        response: t.Array(SkillModel.response),
      },
    )
    .get(
      "/:id",
      async ({ params: { id } }) => {
        const skill = await SkillService.get(db, id);
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
      ({ body }) =>
        SkillService.create(db, {
          name: body.name,
          description: body.description,
          scope: body.scope,
          projectId: body.projectId,
          organizationId: body.organizationId,
          sourceType: body.sourceType,
          sourceUrl: body.sourceUrl,
          installPath: body.installPath,
          manifestPath: body.manifestPath,
        }),
      {
        body: SkillModel.createBody,
        response: SkillModel.response,
      },
    )
    .post(
      "/analyze-repository",
      ({ body }) =>
        SkillService.analyzeRepository(db, {
          source: body.source,
          scope: body.scope,
          projectId: body.projectId,
          organizationId: body.organizationId,
        }),
      {
        body: SkillModel.analyzeRepositoryBody,
        response: SkillModel.analyzeRepositoryResponse,
      },
    )
    .post(
      "/install-repository",
      ({ body }) =>
        SkillService.installFromAnalysis(db, {
          analysisId: body.analysisId,
          selectedSkills: body.selectedSkills,
          allowHighRisk: body.allowHighRisk,
        }),
      {
        body: SkillModel.installRepositoryBody,
        response: SkillModel.installRepositoryResponse,
      },
    )
    .patch(
      "/:id",
      async ({ params: { id }, body }) => {
        const skill = await SkillService.update(db, id, {
          name: body.name,
          description: body.description,
          enabled: body.enabled,
          scope: body.scope,
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
      async ({ params: { id } }) => {
        const deleted = await SkillService.delete(db, id);
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
      async ({ params: { id }, body }) => {
        const skill = await SkillService.toggleEnabled(db, id, body.enabled);
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
}
