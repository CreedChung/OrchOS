import { t } from "elysia"

export const SkillModel = {
  response: t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Optional(t.String()),
    enabled: t.Boolean(),
    scope: t.Union([t.Literal("global"), t.Literal("project")]),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    sourceType: t.Union([t.Literal("manual"), t.Literal("repository")]),
    sourceUrl: t.Optional(t.String()),
    installPath: t.Optional(t.String()),
    manifestPath: t.Optional(t.String()),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),

  createBody: t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    sourceType: t.Optional(t.Union([t.Literal("manual"), t.Literal("repository")])),
    sourceUrl: t.Optional(t.String()),
    installPath: t.Optional(t.String()),
    manifestPath: t.Optional(t.String()),
  }),

  updateBody: t.Object({
    name: t.Optional(t.String()),
    description: t.Optional(t.String()),
    enabled: t.Optional(t.Boolean()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
  }),

  listQuery: t.Object({
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
  }),

  repositoryCandidate: t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    relativePath: t.String(),
  }),

  analyzeRepositoryBody: t.Object({
    source: t.String(),
    scope: t.Optional(t.Union([t.Literal("global"), t.Literal("project")])),
    projectId: t.Optional(t.String()),
    organizationId: t.Optional(t.String()),
  }),

  analyzeRepositoryResponse: t.Object({
    analysisId: t.String(),
    source: t.String(),
    riskLevel: t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")]),
    safeToInstall: t.Boolean(),
    summary: t.String(),
    warnings: t.Array(t.String()),
    installTarget: t.String(),
    installableSkills: t.Array(
      t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        relativePath: t.String(),
      })
    ),
  }),

  installRepositoryBody: t.Object({
    analysisId: t.String(),
    selectedSkills: t.Optional(t.Array(t.String())),
    allowHighRisk: t.Optional(t.Boolean()),
  }),

  installRepositoryResponse: t.Object({
    installed: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        enabled: t.Boolean(),
        scope: t.Union([t.Literal("global"), t.Literal("project")]),
        projectId: t.Optional(t.String()),
        organizationId: t.Optional(t.String()),
        sourceType: t.Union([t.Literal("manual"), t.Literal("repository")]),
        sourceUrl: t.Optional(t.String()),
        installPath: t.Optional(t.String()),
        manifestPath: t.Optional(t.String()),
        createdAt: t.String(),
        updatedAt: t.String(),
      })
    ),
    installTarget: t.String(),
    warnings: t.Array(t.String()),
    riskLevel: t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")]),
  }),
}
