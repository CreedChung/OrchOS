import { db } from "@/db";
import {
  commands,
  conversations,
  inboxMessages,
  goals,
  inboxThreads,
  mcpServers,
  messages,
  projects,
  rules,
  sandboxes,
  skills,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "@/utils";
import type { Project, ProjectPreviewStatus } from "@/types";
import type { ProjectModel } from "@/modules/project/model";
import { executor } from "@/modules/execution/executor";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { readFileSync } from "fs";
import { spawn, type Subprocess } from "bun";

type ProjectPreviewProcess = {
  process: Subprocess;
  command: string;
  url: string;
  port: number;
  startedAt: string;
  logs: string[];
  error?: string;
};

const activePreviewProcesses = new Map<string, ProjectPreviewProcess>();
const MAX_LOG_LINES = 120;

function appendLog(entry: ProjectPreviewProcess, chunk: string) {
  const trimmed = chunk.trim();
  if (!trimmed) return;
  entry.logs.push(trimmed);
  if (entry.logs.length > MAX_LOG_LINES) {
    entry.logs.splice(0, entry.logs.length - MAX_LOG_LINES);
  }
}

function getLocalIpAddress() {
  return process.env.PUBLIC_DEV_HOST || process.env.PREVIEW_HOST || "100.93.216.63";
}

export abstract class ProjectService {
  private static normalizePath(path: string) {
    return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
  }

  private static readPackageJson(projectPath: string): { scripts?: Record<string, string> } | null {
    const packageJsonPath = join(projectPath, "package.json");
    if (!existsSync(packageJsonPath)) return null;

    try {
      return JSON.parse(readFileSync(packageJsonPath, "utf8")) as { scripts?: Record<string, string> };
    } catch {
      return null;
    }
  }

  private static allocatePreviewPort() {
    const usedPorts = new Set(Array.from(activePreviewProcesses.values()).map((entry) => entry.port));
    for (let port = 3000; port <= 3999; port += 1) {
      if (!usedPorts.has(port)) return port;
    }
    return 3000 + activePreviewProcesses.size;
  }

  private static detectPreviewCommand(projectPath: string, port: number) {
    const pkg = ProjectService.readPackageJson(projectPath);
    const devScript = pkg?.scripts?.dev;
    if (!devScript) {
      return { error: "No dev script found in package.json" };
    }

    const hasBunLock = existsSync(join(projectPath, "bun.lock")) || existsSync(join(projectPath, "bun.lockb"));
    const hasPnpmLock = existsSync(join(projectPath, "pnpm-lock.yaml"));
    const hasYarnLock = existsSync(join(projectPath, "yarn.lock"));
    const hasNpmLock = existsSync(join(projectPath, "package-lock.json"));

    const packageManager = hasBunLock
      ? "bun"
      : hasPnpmLock
        ? "pnpm"
        : hasYarnLock
          ? "yarn"
          : hasNpmLock
            ? "npm"
            : "bun";

    const env = {
      HOST: "0.0.0.0",
      PORT: String(port),
      BROWSER: "none",
      NO_OPEN: "1",
    };

    if (packageManager === "bun") {
      return { cmd: ["bun", "run", "dev"], env, command: "bun run dev" };
    }
    if (packageManager === "pnpm") {
      return { cmd: ["pnpm", "dev", "--", "--host", "0.0.0.0", "--port", String(port)], env, command: `pnpm dev -- --host 0.0.0.0 --port ${port}` };
    }
    if (packageManager === "yarn") {
      return { cmd: ["yarn", "dev", "--host", "0.0.0.0", "--port", String(port)], env, command: `yarn dev --host 0.0.0.0 --port ${port}` };
    }
    return { cmd: ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", String(port)], env, command: `npm run dev -- --host 0.0.0.0 --port ${port}` };
  }

  private static mapPreviewStatus(projectId: string, entry?: ProjectPreviewProcess): ProjectPreviewStatus {
    if (!entry) {
      return { projectId, running: false };
    }

    return {
      projectId,
      running: entry.process.exitCode === null,
      command: entry.command,
      url: entry.url,
      port: entry.port,
      pid: entry.process.pid,
      startedAt: entry.startedAt,
      logs: entry.logs.join("\n"),
      error: entry.error,
    };
  }

  static create(name: string, path: string, repositoryUrl?: string): Project {
    const id = generateId("proj");
    const now = timestamp();
    const normalizedPath = ProjectService.normalizePath(path);

    db.insert(projects)
      .values({ id, name, path: normalizedPath, repositoryUrl: repositoryUrl || null, createdAt: now })
      .run();

    return { id, name, path: normalizedPath, repositoryUrl, createdAt: now };
  }

  static get(id: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!row) return undefined;
    return ProjectService.mapRow(row);
  }

  static getByPath(path: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.path, ProjectService.normalizePath(path))).get();
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
    if (patch.path !== undefined) updates.path = ProjectService.normalizePath(patch.path);
    if (patch.repositoryUrl !== undefined) updates.repositoryUrl = patch.repositoryUrl || null;

    if (Object.keys(updates).length === 0) return ProjectService.get(id);

    db.update(projects).set(updates).where(eq(projects.id, id)).run();
    return ProjectService.get(id);
  }

  static delete(id: string): boolean {
    const existing = ProjectService.get(id);
    if (!existing) return false;

    db.delete(rules).where(eq(rules.projectId, id)).run();
    db.delete(mcpServers).where(eq(mcpServers.projectId, id)).run();
    db.delete(skills).where(eq(skills.projectId, id)).run();
    db.delete(sandboxes).where(eq(sandboxes.projectId, id)).run();

    db.update(inboxThreads).set({ projectId: null }).where(eq(inboxThreads.projectId, id)).run();
    db.update(conversations).set({ projectId: null }).where(eq(conversations.projectId, id)).run();
    db.update(messages).set({ projectId: null, projectName: null }).where(eq(messages.projectId, id)).run();

    const projectGoals = db.select({ id: goals.id }).from(goals).where(eq(goals.projectId, id)).all();
    for (const goal of projectGoals) {
      db.update(commands).set({ goalId: null }).where(eq(commands.goalId, goal.id)).run();
      db.update(inboxThreads).set({ primaryGoalId: null }).where(eq(inboxThreads.primaryGoalId, goal.id)).run();
      db.update(inboxMessages).set({ goalId: null }).where(eq(inboxMessages.goalId, goal.id)).run();
    }

    db.delete(goals).where(eq(goals.projectId, id)).run();
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

  static getPreviewStatus(id: string): ProjectPreviewStatus {
    const entry = activePreviewProcesses.get(id);
    if (entry && entry.process.exitCode !== null) {
      activePreviewProcesses.delete(id);
      return ProjectService.mapPreviewStatus(id, {
        ...entry,
        error: entry.error || `Preview process exited with code ${entry.process.exitCode}`,
      });
    }
    return ProjectService.mapPreviewStatus(id, entry);
  }

  static async startPreview(id: string): Promise<ProjectPreviewStatus> {
    const project = ProjectService.get(id);
    if (!project) {
      return { projectId: id, running: false, error: "Project not found" };
    }

    const existing = activePreviewProcesses.get(id);
    if (existing && existing.process.exitCode === null) {
      return ProjectService.mapPreviewStatus(id, existing);
    }

    if (!existsSync(project.path)) {
      return { projectId: id, running: false, error: `Project path does not exist: ${project.path}` };
    }

    const port = ProjectService.allocatePreviewPort();
    const preview = ProjectService.detectPreviewCommand(project.path, port);
    if ("error" in preview) {
      return { projectId: id, running: false, error: preview.error };
    }

    try {
      const url = `http://${getLocalIpAddress()}:${port}`;
      const entry: ProjectPreviewProcess = {
        process: spawn({
          cmd: preview.cmd,
          cwd: project.path,
          env: { ...process.env, ...preview.env },
          stdout: "pipe",
          stderr: "pipe",
        }),
        command: preview.command,
        url,
        port,
        startedAt: timestamp(),
        logs: [],
      };

      activePreviewProcesses.set(id, entry);

      void new Response(entry.process.stdout).text().then((output) => appendLog(entry, output)).catch(() => {});
      void new Response(entry.process.stderr).text().then((output) => appendLog(entry, output)).catch(() => {});
      void entry.process.exited.then((exitCode) => {
        entry.error = exitCode === 0 ? entry.error : `Preview process exited with code ${exitCode}`;
      }).catch((error) => {
        entry.error = error instanceof Error ? error.message : String(error);
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      return ProjectService.getPreviewStatus(id);
    } catch (error) {
      return {
        projectId: id,
        running: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  static mapRow(row: typeof projects.$inferSelect): Project {
    return {
      id: row.id,
      name: row.name,
      path: ProjectService.normalizePath(row.path),
      repositoryUrl: row.repositoryUrl || undefined,
      createdAt: row.createdAt,
    };
  }
}
