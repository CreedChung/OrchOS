import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "fs";
import { homedir, tmpdir } from "os";
import { basename, extname, join, relative, resolve } from "path";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { skills } from "../../db/schema";
import { generateId, timestamp } from "../../utils";
import { executor } from "../execution/executor";
import { ProjectService } from "../project/service";
import type { SkillProfile, SkillRepositoryAnalysis, SkillRepositoryCandidate } from "../../types";

export type { SkillProfile };

type SkillScope = "global" | "project";
type RiskLevel = SkillRepositoryAnalysis["riskLevel"];

interface RepositoryAnalysisCacheEntry {
  analysis: SkillRepositoryAnalysis;
  rootPath: string;
  cleanupPath?: string;
  scope: SkillScope;
  projectId?: string;
  organizationId?: string;
}

interface RepositoryScanStats {
  filesScanned: number;
  scriptFiles: string[];
  binaryFiles: string[];
  packageFiles: string[];
  workflowFiles: string[];
  symlinkFiles: string[];
}

const ANALYSIS_CACHE = new Map<string, RepositoryAnalysisCacheEntry>();
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".idea",
  ".vscode",
]);
const SCRIPT_EXTENSIONS = new Set([
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  ".command",
]);
const BINARY_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".dylib",
  ".so",
  ".bin",
  ".node",
  ".jar",
  ".apk",
]);
const PACKAGE_FILES = new Set([
  "package.json",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "requirements.txt",
]);

export abstract class SkillService {
  static mapRow(row: any): SkillProfile {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      enabled: row.enabled === "true",
      scope: row.scope as SkillScope,
      projectId: row.projectId || undefined,
      organizationId: row.organizationId || undefined,
      sourceType: (row.sourceType as SkillProfile["sourceType"]) || "manual",
      sourceUrl: row.sourceUrl || undefined,
      installPath: row.installPath || undefined,
      manifestPath: row.manifestPath || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static create(data: {
    name: string;
    description?: string;
    scope?: SkillScope;
    projectId?: string;
    organizationId?: string;
    enabled?: boolean;
    sourceType?: SkillProfile["sourceType"];
    sourceUrl?: string;
    installPath?: string;
    manifestPath?: string;
  }): SkillProfile {
    const id = generateId("skill");
    const now = timestamp();

    db.insert(skills)
      .values({
        id,
        name: data.name,
        description: data.description || null,
        enabled: String(data.enabled ?? true),
        scope: data.scope || "global",
        projectId: data.projectId || null,
        organizationId: data.organizationId || null,
        sourceType: data.sourceType || "manual",
        sourceUrl: data.sourceUrl || null,
        installPath: data.installPath || null,
        manifestPath: data.manifestPath || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return {
      id,
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? true,
      scope: data.scope || "global",
      projectId: data.projectId,
      organizationId: data.organizationId,
      sourceType: data.sourceType || "manual",
      sourceUrl: data.sourceUrl,
      installPath: data.installPath,
      manifestPath: data.manifestPath,
      createdAt: now,
      updatedAt: now,
    };
  }

  static get(id: string): SkillProfile | undefined {
    const row = db.select().from(skills).where(eq(skills.id, id)).get();
    if (!row) return undefined;
    return SkillService.mapRow(row);
  }

  static list(options?: {
    projectId?: string;
    organizationId?: string;
    scope?: SkillScope;
  }): SkillProfile[] {
    const allRows = db.select().from(skills).all().map(SkillService.mapRow);

    return allRows.filter((row) => {
      if (options?.scope && row.scope !== options.scope) return false;
      if (options?.projectId && row.projectId !== options.projectId) return false;
      if (options?.organizationId && row.organizationId !== options.organizationId) return false;
      return true;
    });
  }

  static update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      enabled: boolean;
      scope: SkillScope;
      sourceType: SkillProfile["sourceType"];
      sourceUrl: string;
      installPath: string;
      manifestPath: string;
    }>,
  ): SkillProfile | undefined {
    const existing = SkillService.get(id);
    if (!existing) return undefined;

    const updates: Record<string, any> = {
      updatedAt: timestamp(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.enabled !== undefined) updates.enabled = String(data.enabled);
    if (data.scope !== undefined) updates.scope = data.scope;
    if (data.sourceType !== undefined) updates.sourceType = data.sourceType;
    if (data.sourceUrl !== undefined) updates.sourceUrl = data.sourceUrl;
    if (data.installPath !== undefined) updates.installPath = data.installPath;
    if (data.manifestPath !== undefined) updates.manifestPath = data.manifestPath;

    db.update(skills).set(updates).where(eq(skills.id, id)).run();
    return SkillService.get(id);
  }

  static delete(id: string): boolean {
    const existing = SkillService.get(id);
    if (!existing) return false;

    if (existing.sourceType === "repository" && existing.installPath) {
      SkillService.removeInstalledSkill(existing);
    }

    db.delete(skills).where(eq(skills.id, id)).run();
    return true;
  }

  static toggleEnabled(id: string, enabled: boolean): SkillProfile | undefined {
    db.update(skills)
      .set({ enabled: String(enabled), updatedAt: timestamp() })
      .where(eq(skills.id, id))
      .run();

    return SkillService.get(id);
  }

  static async analyzeRepository(data: {
    source: string;
    scope?: SkillScope;
    projectId?: string;
    organizationId?: string;
  }): Promise<SkillRepositoryAnalysis> {
    const scope = data.scope || "global";
    const installTarget = SkillService.getInstallTarget(scope, data.projectId);
    const source = data.source.trim();

    if (!source) {
      throw new Error("Repository source is required");
    }

    const localPath = SkillService.resolveLocalSource(source);
    let rootPath = localPath;
    let cleanupPath: string | undefined;

    if (!rootPath) {
      cleanupPath = mkdtempSync(join(tmpdir(), "orchos-skill-"));
      const result = await executor.git(`clone --depth 1 "${source}" "${cleanupPath}"`);
      if (!result.success) {
        SkillService.cleanupPath(cleanupPath);
        throw new Error(result.error || result.output || "Failed to clone repository");
      }
      rootPath = cleanupPath;
    }

    const { candidates, stats } = SkillService.scanRepository(rootPath);
    const warnings = SkillService.buildWarnings(stats, candidates);
    const riskLevel = SkillService.deriveRiskLevel(stats, candidates);
    const summary = SkillService.buildSummary(candidates, stats, riskLevel);
    const analysisId = generateId("skill_analysis");

    const analysis: SkillRepositoryAnalysis = {
      analysisId,
      source,
      riskLevel,
      safeToInstall: candidates.length > 0 && riskLevel !== "high",
      summary,
      warnings,
      installTarget,
      installableSkills: candidates,
    };

    ANALYSIS_CACHE.set(analysisId, {
      analysis,
      rootPath,
      cleanupPath,
      scope,
      projectId: data.projectId,
      organizationId: data.organizationId,
    });

    return analysis;
  }

  static installFromAnalysis(data: {
    analysisId: string;
    selectedSkills?: string[];
    allowHighRisk?: boolean;
  }): {
    installed: SkillProfile[];
    installTarget: string;
    warnings: string[];
    riskLevel: RiskLevel;
  } {
    const cached = ANALYSIS_CACHE.get(data.analysisId);
    if (!cached) {
      throw new Error("Repository analysis expired. Analyze again before installing.");
    }

    if (cached.analysis.riskLevel === "high" && !data.allowHighRisk) {
      throw new Error("Repository was marked high risk. Review the warnings before installing.");
    }

    const selectedSet = new Set(
      data.selectedSkills && data.selectedSkills.length > 0
        ? data.selectedSkills
        : cached.analysis.installableSkills.map((candidate) => candidate.relativePath),
    );

    const selected = cached.analysis.installableSkills.filter((candidate) =>
      selectedSet.has(candidate.relativePath),
    );
    if (selected.length === 0) {
      throw new Error("No installable skills were selected.");
    }

    mkdirSync(cached.analysis.installTarget, { recursive: true });

    const installed = selected.map((candidate) => {
      const sourceDir =
        candidate.relativePath === "."
          ? cached.rootPath
          : join(cached.rootPath, candidate.relativePath);
      const dirName = SkillService.sanitizeDirectoryName(basename(sourceDir) || candidate.name);
      const targetDir = SkillService.getUniqueInstallPath(cached.analysis.installTarget, dirName);

      cpSync(sourceDir, targetDir, {
        recursive: true,
        filter: (src) => {
          const name = basename(src);
          return !SKIP_DIRS.has(name) && name !== ".DS_Store";
        },
      });

      return SkillService.create({
        name: candidate.name,
        description: candidate.description,
        scope: cached.scope,
        projectId: cached.projectId,
        organizationId: cached.organizationId,
        sourceType: "repository",
        sourceUrl: cached.analysis.source,
        installPath: targetDir,
        manifestPath: join(targetDir, "SKILL.md"),
      });
    });

    if (cached.cleanupPath) {
      SkillService.cleanupPath(cached.cleanupPath);
    }
    ANALYSIS_CACHE.delete(data.analysisId);

    return {
      installed,
      installTarget: cached.analysis.installTarget,
      warnings: cached.analysis.warnings,
      riskLevel: cached.analysis.riskLevel,
    };
  }

  private static resolveLocalSource(source: string): string | undefined {
    if (/^(https?:\/\/|git@|ssh:\/\/)/i.test(source)) {
      return undefined;
    }

    const expanded = source.startsWith("~") ? join(homedir(), source.slice(1)) : source;
    const resolved = resolve(expanded);

    if (!existsSync(resolved)) {
      throw new Error(`Local path does not exist: ${resolved}`);
    }

    return resolved;
  }

  private static scanRepository(rootPath: string): {
    candidates: SkillRepositoryCandidate[];
    stats: RepositoryScanStats;
  } {
    const candidateMap = new Map<string, SkillRepositoryCandidate>();
    const stats: RepositoryScanStats = {
      filesScanned: 0,
      scriptFiles: [],
      binaryFiles: [],
      packageFiles: [],
      workflowFiles: [],
      symlinkFiles: [],
    };

    const walk = (dirPath: string) => {
      for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }

        const fullPath = join(dirPath, entry.name);
        const relativePath = relative(rootPath, fullPath) || ".";
        const stat = lstatSync(fullPath);

        if (stat.isSymbolicLink()) {
          stats.symlinkFiles.push(relativePath);
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }

        stats.filesScanned += 1;

        if (entry.name === "SKILL.md") {
          const skillDir = relative(rootPath, dirPath) || ".";
          const candidate = SkillService.parseSkillCandidate(rootPath, dirPath, skillDir);
          candidateMap.set(candidate.relativePath, candidate);
          continue;
        }

        const ext = extname(entry.name).toLowerCase();
        if (SCRIPT_EXTENSIONS.has(ext)) {
          stats.scriptFiles.push(relativePath);
        }
        if (BINARY_EXTENSIONS.has(ext)) {
          stats.binaryFiles.push(relativePath);
        }
        if (PACKAGE_FILES.has(entry.name)) {
          stats.packageFiles.push(relativePath);
        }
        if (relativePath.startsWith(".github/workflows/")) {
          stats.workflowFiles.push(relativePath);
        }
      }
    };

    walk(rootPath);

    return {
      candidates: Array.from(candidateMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      stats,
    };
  }

  private static parseSkillCandidate(
    rootPath: string,
    dirPath: string,
    relativePath: string,
  ): SkillRepositoryCandidate {
    const content = readFileSync(join(dirPath, "SKILL.md"), "utf8");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const heading = lines.find((line) => line.startsWith("# "));
    const description = lines.find(
      (line) => !line.startsWith("#") && !line.startsWith("---") && !line.startsWith(">"),
    );

    return {
      name: heading ? heading.replace(/^#\s+/, "").trim() : basename(dirPath),
      description: description || undefined,
      relativePath: relativePath || relative(rootPath, dirPath) || ".",
    };
  }

  private static buildWarnings(
    stats: RepositoryScanStats,
    candidates: SkillRepositoryCandidate[],
  ): string[] {
    const warnings: string[] = [];

    if (candidates.length === 0) {
      warnings.push("No SKILL.md file was found in the repository.");
    }
    if (stats.binaryFiles.length > 0) {
      warnings.push(
        `Binary files detected: ${stats.binaryFiles.slice(0, 3).join(", ")}${stats.binaryFiles.length > 3 ? "..." : ""}`,
      );
    }
    if (stats.symlinkFiles.length > 0) {
      warnings.push(
        `Symbolic links detected: ${stats.symlinkFiles.slice(0, 3).join(", ")}${stats.symlinkFiles.length > 3 ? "..." : ""}`,
      );
    }
    if (stats.scriptFiles.length > 0) {
      warnings.push(
        `Shell or command scripts detected: ${stats.scriptFiles.slice(0, 3).join(", ")}${stats.scriptFiles.length > 3 ? "..." : ""}`,
      );
    }
    if (stats.packageFiles.length > 0) {
      warnings.push(
        `Package or dependency manifests detected: ${stats.packageFiles.slice(0, 3).join(", ")}${stats.packageFiles.length > 3 ? "..." : ""}`,
      );
    }
    if (stats.workflowFiles.length > 0) {
      warnings.push(
        `CI workflow files detected: ${stats.workflowFiles.slice(0, 3).join(", ")}${stats.workflowFiles.length > 3 ? "..." : ""}`,
      );
    }
    if (stats.filesScanned > 500) {
      warnings.push(`Large repository footprint: ${stats.filesScanned} files scanned.`);
    }

    return warnings;
  }

  private static deriveRiskLevel(
    stats: RepositoryScanStats,
    candidates: SkillRepositoryCandidate[],
  ): RiskLevel {
    if (candidates.length === 0 || stats.binaryFiles.length > 0 || stats.symlinkFiles.length > 0) {
      return "high";
    }

    if (
      stats.scriptFiles.length > 0 ||
      stats.packageFiles.length > 0 ||
      stats.workflowFiles.length > 0 ||
      stats.filesScanned > 500
    ) {
      return "medium";
    }

    return "low";
  }

  private static buildSummary(
    candidates: SkillRepositoryCandidate[],
    stats: RepositoryScanStats,
    riskLevel: RiskLevel,
  ): string {
    const skillPart =
      candidates.length === 1
        ? `Found 1 installable skill`
        : `Found ${candidates.length} installable skills`;

    const filePart = `after scanning ${stats.filesScanned} files`;

    if (riskLevel === "low") {
      return `${skillPart} ${filePart}. No high-risk patterns were detected.`;
    }

    if (riskLevel === "medium") {
      return `${skillPart} ${filePart}. Review the warnings before installing.`;
    }

    return `${skillPart} ${filePart}. High-risk patterns were detected and installation should be reviewed carefully.`;
  }

  private static getInstallTarget(scope: SkillScope, projectId?: string): string {
    if (scope === "project") {
      if (!projectId) {
        throw new Error("Project scope requires a project selection.");
      }
      const project = ProjectService.get(projectId);
      if (!project) {
        throw new Error("Selected project was not found.");
      }
      return join(project.path, ".agents", "skills");
    }

    return join(homedir(), ".agents", "skills");
  }

  private static sanitizeDirectoryName(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "") || `skill-${Date.now()}`
    );
  }

  private static getUniqueInstallPath(baseDir: string, dirName: string): string {
    let suffix = 0;
    let candidate = join(baseDir, dirName);

    while (existsSync(candidate)) {
      suffix += 1;
      candidate = join(baseDir, `${dirName}-${suffix}`);
    }

    return candidate;
  }

  private static removeInstalledSkill(skill: SkillProfile) {
    const installPath = skill.installPath ? resolve(skill.installPath) : undefined;
    if (!installPath || !existsSync(installPath)) {
      return;
    }

    const globalRoot = resolve(join(homedir(), ".agents", "skills"));
    const projectRoot = skill.projectId
      ? resolve(join(ProjectService.get(skill.projectId)?.path || "", ".agents", "skills"))
      : undefined;

    const allowed =
      installPath.startsWith(`${globalRoot}/`) ||
      (projectRoot ? installPath.startsWith(`${projectRoot}/`) : false);

    if (allowed) {
      rmSync(installPath, { recursive: true, force: true });
    }
  }

  private static cleanupPath(path: string) {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  }
}
