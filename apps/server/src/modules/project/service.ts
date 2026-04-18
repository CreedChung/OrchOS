import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "@/utils";
import type { Project } from "@/types";
import type { ProjectModel } from "@/modules/project/model";
import { executor } from "@/modules/execution/executor";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export abstract class ProjectService {
  static create(name: string, path: string, repositoryUrl?: string): Project {
    const id = generateId("proj");
    const now = timestamp();

    db.insert(projects)
      .values({ id, name, path, repositoryUrl: repositoryUrl || null, createdAt: now })
      .run();

    return { id, name, path, repositoryUrl, createdAt: now };
  }

  static get(id: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!row) return undefined;
    return ProjectService.mapRow(row);
  }

  static getByPath(path: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.path, path)).get();
    if (!row) return undefined;
    return ProjectService.mapRow(row);
  }

  static list(): Project[] {
    return db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .all()
      .map(ProjectService.mapRow);
  }

  static update(id: string, patch: ProjectModel["updateBody"]): Project | undefined {
    const updates: Partial<typeof projects.$inferInsert> = {};
    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.path !== undefined) updates.path = patch.path;
    if (patch.repositoryUrl !== undefined) updates.repositoryUrl = patch.repositoryUrl || null;

    if (Object.keys(updates).length === 0) return ProjectService.get(id);

    db.update(projects).set(updates).where(eq(projects.id, id)).run();
    return ProjectService.get(id);
  }

  static delete(id: string): boolean {
    const existing = ProjectService.get(id);
    if (!existing) return false;
    db.delete(projects).where(eq(projects.id, id)).run();
    return true;
  }

  static async clone(
    id: string,
    options: { force?: boolean } = {},
  ): Promise<{
    success: boolean;
    output: string;
    error?: string;
    path: string;
  }> {
    const project = ProjectService.get(id);
    if (!project) {
      return { success: false, output: "", error: "Project not found", path: "" };
    }
    if (!project.repositoryUrl) {
      return {
        success: false,
        output: "",
        error: "Project has no repository URL",
        path: project.path,
      };
    }

    // Ensure the parent directory exists
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

    // Check if directory already exists
    const repoName =
      project.repositoryUrl
        .split("/")
        .pop()
        ?.replace(/\.git$/, "") || "";
    const targetPath = join(project.path, repoName);

    if (existsSync(targetPath)) {
      if (options.force) {
        // Remove existing directory for fresh clone
        await executor.run(`rm -rf "${targetPath}"`);
      } else {
        return {
          success: false,
          output: "",
          error: `Directory "${targetPath}" already exists. Use force option to overwrite.`,
          path: targetPath,
        };
      }
    }

    // Execute git clone
    const result = await executor.git(`clone "${project.repositoryUrl}" "${targetPath}"`);

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
