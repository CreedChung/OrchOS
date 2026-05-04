import type { AppDb } from "../../db/types";
import { projects } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import type { Project } from "../../types";
import type { ProjectModel } from "./model";
import { getRemoteExecutionAdapter } from "../../runtime/execution-adapter";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

type ExecutorModule = {
  executor: {
    cloneProject: (
      repositoryUrl: string,
      destinationPath: string,
      options?: { force?: boolean },
    ) => Promise<{ success: boolean; output: string; error?: string }>;
    run?: (command: string) => Promise<{ success: boolean; output: string; error?: string }>;
    git?: (command: string) => Promise<{ success: boolean; output: string; error?: string }>;
  };
};

async function getExecutor() {
  return null as ExecutorModule["executor"] | null;
}

export abstract class ProjectService {
  static async create(
    db: AppDb,
    name: string,
    path: string,
    repositoryUrl?: string,
  ): Promise<Project> {
    const id = generateId("proj");
    const now = timestamp();

    await db
      .insert(projects)
      .values({
        id,
        name,
        path,
        repositoryUrl: repositoryUrl || null,
        createdAt: now,
      })
      .run();

    return { id, name, path, repositoryUrl, createdAt: now };
  }

  static async get(db: AppDb, id: string): Promise<Project | undefined> {
    const row = await db.select().from(projects).where(eq(projects.id, id)).get();
    if (!row) return undefined;
    return ProjectService.mapRow(row);
  }

  static async getByPath(db: AppDb, path: string): Promise<Project | undefined> {
    const row = await db.select().from(projects).where(eq(projects.path, path)).get();
    if (!row) return undefined;
    return ProjectService.mapRow(row);
  }

  static async list(db: AppDb): Promise<Project[]> {
    const rows = await db.select().from(projects).orderBy(desc(projects.createdAt)).all();
    return rows.map(ProjectService.mapRow);
  }

  static async update(
    db: AppDb,
    id: string,
    patch: ProjectModel["updateBody"],
  ): Promise<Project | undefined> {
    const updates: Partial<typeof projects.$inferInsert> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.path !== undefined) updates.path = patch.path;
    if (patch.repositoryUrl !== undefined) updates.repositoryUrl = patch.repositoryUrl || null;

    if (Object.keys(updates).length === 0) return ProjectService.get(db, id);

    await db.update(projects).set(updates).where(eq(projects.id, id)).run();
    return ProjectService.get(db, id);
  }

  static async delete(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).run();
    return getRowsAffected(result) > 0;
  }

  static async clone(
    db: AppDb,
    id: string,
    options: { force?: boolean } = {},
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    path: string;
  }> {
    const executor = await getExecutor();
    if (!executor) {
      return {
        success: false,
        output: "",
        error: "Executor not available in this environment",
        path: "",
      };
    }

    const project = await ProjectService.get(db, id);
    if (!project) {
      return {
        success: false,
        output: "",
        error: "Project not found",
        path: "",
      };
    }
    if (!project.repositoryUrl) {
      return {
        success: false,
        output: "",
        error: "Project has no repository URL",
        path: project.path,
      };
    }

    const remoteAdapter = getRemoteExecutionAdapter();
    if (remoteAdapter?.prepareProject) {
      try {
        const workspace = await remoteAdapter.prepareProject({
          id: project.id,
          path: project.path,
          repositoryUrl: project.repositoryUrl,
        });
        return {
          success: true,
          output: `Repository ready in Cloudflare Sandbox at ${workspace.rootPath}`,
          path: workspace.rootPath,
        };
      } catch (error) {
        return {
          success: false,
          output: "",
          error: error instanceof Error ? error.message : String(error),
          path: project.path,
        };
      }
    }

    const parentDir = project.path.split("/").slice(0, -1).join("/");
    if (parentDir && !existsSync(parentDir)) {
      try {
        mkdirSync(parentDir, { recursive: true });
      } catch (err) {
        return {
          success: false,
          output: "",
          error: `Failed to create directory: ${err instanceof Error ? err.message : String(err)}`,
          path: project.path,
        };
      }
    }

    const repoName =
      project.repositoryUrl
        .split("/")
        .pop()
        ?.replace(/\.git$/, "") || "";
    const targetPath = join(project.path, repoName);

    if (existsSync(targetPath)) {
      return {
        success: false,
        output: "",
        error: `Directory "${targetPath}" already exists. Use force option to overwrite.`,
        path: targetPath,
      };
    }

    const result = await executor.cloneProject(project.repositoryUrl, targetPath, options);

    return {
      success: result.success,
      output: result.output.trim(),
      error: result.success ? undefined : result.error,
      path: targetPath,
    };
  }

  static mapRow(row: typeof projects.$inferSelect): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      repositoryUrl: row.repositoryUrl || undefined,
      createdAt: row.createdAt,
    };
  }
}
