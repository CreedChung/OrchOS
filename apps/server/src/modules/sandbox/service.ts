import { Sandbox } from "e2b";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, posix as posixPath, relative, sep } from "node:path";
import { executor } from "@/modules/execution/executor";
import { ProjectService } from "@/modules/project/service";
import { RuntimeService } from "@/modules/runtime/service";
import { db } from "@/db";
import { sandboxes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId, timestamp } from "@/utils";
import { eventBus } from "@/modules/event/event-bus";

type PermissionReply = "once" | "always" | "reject";

type SessionEvent = {
  sequenceNumber: number;
  method: string;
  params: any;
};

type SessionRecord = {
  sessionId: string;
  agentType: string;
  status: "active" | "closed";
  createdAt: string;
  cwd: string;
  env?: Record<string, string>;
  additionalInstructions?: string;
  model?: string;
  mode?: string;
  thoughtLevel?: string;
  events: SessionEvent[];
  nextSequenceNumber: number;
};

type FileKind = "dir" | "file";

type DirectoryEntry = {
  relativePath: string;
  type: FileKind;
};

interface VMInstance {
  sandbox: Sandbox;
  vmId: string;
  projectId: string;
  agentType: string;
  status: "creating" | "running" | "disposed" | "error";
  sandboxId: string;
  sessions: Map<string, SessionRecord>;
  createdAt: string;
}

const vmInstances = new Map<string, VMInstance>();

const DEFAULT_AGENT_TYPE = "pi";
const DEFAULT_SESSION_CWD = "/home/user/workspace";
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const PROJECT_ROOT = "/home/user/project";

export abstract class SandboxService {
  static async createVM(options: {
    projectId: string;
    agentType?: string;
    additionalInstructions?: string;
    readOnlyMount?: boolean;
  }): Promise<VMInstance> {
    const project = ProjectService.get(options.projectId);
    if (!project) throw new Error("Project not found");

    const vmId = generateId("vm");
    const agentType = options.agentType || DEFAULT_AGENT_TYPE;

    const instance: VMInstance = {
      sandbox: null as any,
      vmId,
      projectId: options.projectId,
      agentType,
      status: "creating",
      sandboxId: "",
      sessions: new Map(),
      createdAt: timestamp(),
    };

    vmInstances.set(vmId, instance);

    try {
      const sandbox = await Sandbox.create({
        timeoutMs: DEFAULT_TIMEOUT_MS,
        metadata: {
          projectId: options.projectId,
          agentType,
        },
      });

      await sandbox.files.makeDir(DEFAULT_SESSION_CWD);
      await sandbox.files.makeDir(PROJECT_ROOT);

      instance.sandbox = sandbox;
      instance.sandboxId = sandbox.sandboxId;

      if (project.path) {
        await this.syncProjectFromHostToSandbox(instance, project.path);
      }

      if (options.additionalInstructions) {
        await sandbox.files.write(
          `${DEFAULT_SESSION_CWD}/SANDBOX_INSTRUCTIONS.txt`,
          options.additionalInstructions,
        );
      }

      instance.status = "running";

      db.insert(sandboxes)
        .values({
          id: vmId,
          projectId: options.projectId,
          agentType,
          status: "running",
          createdAt: instance.createdAt,
        })
        .run();

      eventBus.emit("sandbox_created", { vmId, projectId: options.projectId }, undefined);
      return instance;
    } catch (err) {
      instance.status = "error";
      throw err;
    }
  }

  static getVM(vmId: string): VMInstance | undefined {
    return vmInstances.get(vmId);
  }

  static listVMs(): Array<{
    vmId: string;
    projectId: string;
    status: string;
    agentType: string;
    sessions: number;
    createdAt: string;
  }> {
    return Array.from(vmInstances.values()).map((inst) => ({
      vmId: inst.vmId,
      projectId: inst.projectId,
      status: inst.status,
      agentType: inst.agentType,
      sessions: inst.sessions.size,
      createdAt: inst.createdAt,
    }));
  }

  static async disposeVM(vmId: string): Promise<boolean> {
    const instance = vmInstances.get(vmId);
    if (!instance) return false;

    try {
      for (const [sessionId] of instance.sessions) {
        try {
          this.closeSession(sessionId);
        } catch {}
      }

      await instance.sandbox.kill();
      instance.status = "disposed";
      vmInstances.delete(vmId);

      db.update(sandboxes).set({ status: "disposed" }).where(eq(sandboxes.id, vmId)).run();
      eventBus.emit("sandbox_disposed", { vmId }, undefined);
      return true;
    } catch {
      instance.status = "error";
      return false;
    }
  }

  static async createSession(
    vmId: string,
    options?: {
      agentType?: string;
      cwd?: string;
      env?: Record<string, string>;
      additionalInstructions?: string;
      mcpServers?: unknown;
    },
  ): Promise<{ sessionId: string; agentType: string }> {
    const instance = vmInstances.get(vmId);
    if (!instance) throw new Error("VM not found");
    if (instance.status !== "running")
      throw new Error(`VM is not running (status: ${instance.status})`);

    const agentType = options?.agentType || instance.agentType;
    const project = ProjectService.get(instance.projectId);
    const sessionId = generateId("session");
    const sessionRecord: SessionRecord = {
      sessionId,
      agentType,
      status: "active" as const,
      createdAt: timestamp(),
      cwd: options?.cwd || (project?.path ? PROJECT_ROOT : DEFAULT_SESSION_CWD),
      env: options?.env,
      additionalInstructions: options?.additionalInstructions,
      events: [],
      nextSequenceNumber: 1,
    };

    if (options?.mcpServers) {
      this.appendSessionEvent(instance, sessionRecord, "session.warning", {
        message: "E2B sandbox adapter currently ignores mcpServers in session options",
      });
    }

    instance.sessions.set(sessionId, sessionRecord);

    return { sessionId, agentType };
  }

  static async sendPrompt(
    sessionId: string,
    text: string,
  ): Promise<{
    sessionId: string;
    text: string;
    success: boolean;
  }> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    try {
      const project = ProjectService.get(instance.projectId);
      const tempRoot = await mkdtemp(join(tmpdir(), "orchos-agent-"));
      const tempProjectPath = join(tempRoot, "project");

      const prompt = this.buildPrompt(text, session);
      this.appendSessionEvent(instance, session, "prompt.started", {
        text,
        cwd: session.cwd,
        agentType: session.agentType,
      });

      try {
        if (project?.path) {
          this.appendSessionEvent(instance, session, "sync.host_to_sandbox.started", {
            projectPath: project.path,
          });
          await this.syncProjectFromHostToSandbox(instance, project.path);
          this.appendSessionEvent(instance, session, "sync.host_to_sandbox.completed", {
            projectPath: project.path,
          });

          await this.mirrorHostDirectory(project.path, tempProjectPath);
        } else {
          await mkdir(tempProjectPath, { recursive: true });
        }

        const runtimeTarget = this.resolveRuntimeTarget(session.agentType);
        if (!runtimeTarget) {
          throw new Error(
            `No runtime command configured for session agent type '${session.agentType}'`,
          );
        }

        const result = await executor.invokeAgentCLI(runtimeTarget, prompt, {
          cwd: tempProjectPath,
          env: session.env,
          timeout: 120000,
        });

        if (project?.path) {
          this.appendSessionEvent(instance, session, "sync.runner_to_host.started", {
            projectPath: project.path,
          });
          await this.mirrorHostDirectory(tempProjectPath, project.path);
          this.appendSessionEvent(instance, session, "sync.runner_to_host.completed", {
            projectPath: project.path,
          });

          this.appendSessionEvent(instance, session, "sync.host_to_sandbox.started", {
            projectPath: project.path,
          });
          await this.syncProjectFromHostToSandbox(instance, project.path);
          this.appendSessionEvent(instance, session, "sync.host_to_sandbox.completed", {
            projectPath: project.path,
          });
        }

        const output = `${result.output}${result.error ? `\n${result.error}` : ""}`.trim();
        this.appendSessionEvent(instance, session, "prompt.completed", {
          exitCode: result.exitCode,
          success: result.success,
        });

        return {
          sessionId,
          text: output,
          success: result.success,
        };
      } finally {
        await rm(tempRoot, { recursive: true, force: true });
      }
    } catch (err) {
      this.appendSessionEvent(instance, session, "prompt.failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        sessionId,
        text: err instanceof Error ? err.message : String(err),
        success: false,
      };
    }
  }

  static async cancelPrompt(sessionId: string): Promise<boolean> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    this.appendSessionEvent(instance, session, "prompt.cancel_unsupported", {
      message: "E2B command execution is currently synchronous in this adapter",
    });
    return false;
  }

  static getSessionEvents(
    sessionId: string,
    since?: number,
  ): Array<{
    sequenceNumber: number;
    method: string;
    params: any;
  }> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    return session.events.filter((event) => since === undefined || event.sequenceNumber > since);
  }

  static async respondPermission(
    sessionId: string,
    permissionId: string,
    reply: PermissionReply,
  ): Promise<void> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");

    this.appendSessionEvent(instance, session, "permission.reply_ignored", {
      permissionId,
      reply,
      message: "E2B adapter does not implement interactive permission requests",
    });
  }

  static async setSessionModel(sessionId: string, model: string): Promise<void> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.model = model;
  }

  static async setSessionMode(sessionId: string, mode: string): Promise<void> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.mode = mode;
  }

  static async setSessionThoughtLevel(sessionId: string, level: string): Promise<void> {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");
    const session = instance.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.thoughtLevel = level;
  }

  static closeSession(sessionId: string): void {
    const instance = this.findInstanceBySession(sessionId);
    if (!instance) throw new Error("Session not found");

    const session = instance.sessions.get(sessionId);
    if (session) {
      session.status = "closed";
      this.appendSessionEvent(instance, session, "session.closed", {});
    }
    instance.sessions.delete(sessionId);
  }

  static async writeFile(vmId: string, path: string, content: string): Promise<void> {
    const instance = vmInstances.get(vmId);
    if (!instance || instance.status !== "running") throw new Error("VM not found or not running");
    await instance.sandbox.files.write(path, content);

    if (this.isProjectPath(path)) {
      const project = ProjectService.get(instance.projectId);
      if (project?.path) {
        await this.syncProjectFromSandboxToHost(instance, project.path);
      }
    }
  }

  static async readFile(vmId: string, path: string): Promise<string> {
    const instance = vmInstances.get(vmId);
    if (!instance || instance.status !== "running") throw new Error("VM not found or not running");

    if (this.isProjectPath(path)) {
      const project = ProjectService.get(instance.projectId);
      if (project?.path) {
        await this.syncProjectFromHostToSandbox(instance, project.path);
      }
    }

    return (await instance.sandbox.files.read(path, { format: "text" })) as string;
  }

  static async execInVM(
    vmId: string,
    command: string,
  ): Promise<{ success: boolean; output: string; exitCode: number }> {
    const instance = vmInstances.get(vmId);
    if (!instance || instance.status !== "running") throw new Error("VM not found or not running");

    const project = ProjectService.get(instance.projectId);
    if (project?.path) {
      await this.syncProjectFromHostToSandbox(instance, project.path);
    }

    const result = await instance.sandbox.commands.run(command, { timeoutMs: 120000 });

    if (project?.path) {
      await this.syncProjectFromSandboxToHost(instance, project.path);
    }

    return {
      success: ((result as any).exitCode ?? 1) === 0,
      output: `${(result as any).stdout ?? ""}${(result as any).stderr ?? ""}`,
      exitCode: (result as any).exitCode ?? 1,
    };
  }

  private static findInstanceBySession(sessionId: string): VMInstance | undefined {
    for (const instance of vmInstances.values()) {
      if (instance.sessions.has(sessionId)) return instance;
    }
    return undefined;
  }

  private static appendSessionEvent(
    instance: VMInstance,
    session: SessionRecord,
    method: string,
    params: any,
  ): void {
    const event = {
      sequenceNumber: session.nextSequenceNumber++,
      method,
      params,
    };
    session.events.push(event);
    eventBus.emit(
      "sandbox_session_event",
      {
        vmId: instance.vmId,
        sessionId: session.sessionId,
        method,
        params,
      },
      undefined,
    );
  }

  private static resolveRuntimeTarget(agentType: string): string | undefined {
    const runtime =
      RuntimeService.get(agentType) ||
      RuntimeService.getByRegistryId(agentType) ||
      RuntimeService.getByName(agentType);
    if (runtime?.registryId) return runtime.registryId;
    if (runtime?.name) return runtime.name;
    if (runtime?.command) return runtime.command;

    const normalized = agentType.trim().toLowerCase();
    if (!normalized) return undefined;
    return normalized;
  }

  private static isProjectPath(path: string): boolean {
    return path === PROJECT_ROOT || path.startsWith(`${PROJECT_ROOT}/`);
  }

  private static async syncProjectFromHostToSandbox(
    instance: VMInstance,
    hostProjectPath: string,
  ): Promise<void> {
    await this.mirrorHostDirectoryToSandbox(hostProjectPath, instance.sandbox, PROJECT_ROOT);
  }

  private static async syncProjectFromSandboxToHost(
    instance: VMInstance,
    hostProjectPath: string,
  ): Promise<void> {
    await this.mirrorSandboxDirectoryToHost(instance.sandbox, PROJECT_ROOT, hostProjectPath);
  }

  private static async listHostDirectory(root: string): Promise<DirectoryEntry[]> {
    const entries: DirectoryEntry[] = [];

    async function walk(currentPath: string): Promise<void> {
      const children = await readdir(currentPath, { withFileTypes: true });
      for (const child of children) {
        if (child.isSymbolicLink()) continue;

        const absolutePath = join(currentPath, child.name);
        const relativePath = relative(root, absolutePath);
        if (!relativePath) continue;

        if (child.isDirectory()) {
          entries.push({ relativePath, type: "dir" });
          await walk(absolutePath);
          continue;
        }

        if (child.isFile()) {
          entries.push({ relativePath, type: "file" });
        }
      }
    }

    await mkdir(root, { recursive: true });
    await walk(root);
    return entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private static async listSandboxDirectory(
    sandbox: Sandbox,
    root: string,
  ): Promise<DirectoryEntry[]> {
    const entries: DirectoryEntry[] = [];

    async function walk(currentPath: string): Promise<void> {
      const children = await sandbox.files.list(currentPath);
      for (const child of children) {
        const relativePath = posixPath.relative(root, child.path);
        if (!relativePath) continue;

        if (child.type === "dir") {
          entries.push({ relativePath, type: "dir" });
          await walk(child.path);
          continue;
        }

        if (child.type === "file") {
          entries.push({ relativePath, type: "file" });
        }
      }
    }

    if (!(await sandbox.files.exists(root))) {
      return entries;
    }

    await walk(root);
    return entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  private static async mirrorHostDirectory(sourceRoot: string, targetRoot: string): Promise<void> {
    await mkdir(targetRoot, { recursive: true });

    const sourceEntries = await this.listHostDirectory(sourceRoot);
    const targetEntries = await this.listHostDirectory(targetRoot);
    const sourceMap = new Map(sourceEntries.map((entry) => [entry.relativePath, entry.type]));

    for (const entry of sourceEntries) {
      const sourcePath = join(sourceRoot, entry.relativePath);
      const targetPath = join(targetRoot, entry.relativePath);
      if (entry.type === "dir") {
        await mkdir(targetPath, { recursive: true });
        continue;
      }

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await readFile(sourcePath));
    }

    await this.removeExtraHostEntries(targetRoot, targetEntries, sourceMap);
  }

  private static async mirrorHostDirectoryToSandbox(
    sourceRoot: string,
    sandbox: Sandbox,
    targetRoot: string,
  ): Promise<void> {
    await sandbox.files.makeDir(targetRoot);

    const sourceEntries = await this.listHostDirectory(sourceRoot);
    const targetEntries = await this.listSandboxDirectory(sandbox, targetRoot);
    const sourceMap = new Map(sourceEntries.map((entry) => [this.toPosixPath(entry.relativePath), entry.type]));

    for (const entry of sourceEntries) {
      const relativePath = this.toPosixPath(entry.relativePath);
      const sourcePath = join(sourceRoot, entry.relativePath);
      const targetPath = posixPath.join(targetRoot, relativePath);
      if (entry.type === "dir") {
        await sandbox.files.makeDir(targetPath);
        continue;
      }

      const data = await readFile(sourcePath);
      await sandbox.files.write(targetPath, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    }

    await this.removeExtraSandboxEntries(sandbox, targetRoot, targetEntries, sourceMap);
  }

  private static async mirrorSandboxDirectoryToHost(
    sandbox: Sandbox,
    sourceRoot: string,
    targetRoot: string,
  ): Promise<void> {
    await mkdir(targetRoot, { recursive: true });

    const sourceEntries = await this.listSandboxDirectory(sandbox, sourceRoot);
    const targetEntries = await this.listHostDirectory(targetRoot);
    const sourceMap = new Map(sourceEntries.map((entry) => [entry.relativePath, entry.type]));

    for (const entry of sourceEntries) {
      const targetPath = join(targetRoot, entry.relativePath.split("/").join(sep));
      const sourcePath = posixPath.join(sourceRoot, entry.relativePath);
      if (entry.type === "dir") {
        await mkdir(targetPath, { recursive: true });
        continue;
      }

      const data = (await sandbox.files.read(sourcePath, { format: "bytes" })) as Uint8Array;
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, data);
    }

    await this.removeExtraHostEntries(targetRoot, targetEntries, sourceMap);
  }

  private static async removeExtraHostEntries(
    targetRoot: string,
    existingEntries: DirectoryEntry[],
    sourceMap: Map<string, FileKind>,
  ): Promise<void> {
    const extras = existingEntries.filter((entry) => !sourceMap.has(entry.relativePath));
    extras.sort((a, b) => b.relativePath.length - a.relativePath.length);

    for (const entry of extras) {
      await rm(join(targetRoot, entry.relativePath), { recursive: true, force: true });
    }
  }

  private static async removeExtraSandboxEntries(
    sandbox: Sandbox,
    targetRoot: string,
    existingEntries: DirectoryEntry[],
    sourceMap: Map<string, FileKind>,
  ): Promise<void> {
    const extras = existingEntries.filter((entry) => !sourceMap.has(entry.relativePath));
    extras.sort((a, b) => b.relativePath.length - a.relativePath.length);

    for (const entry of extras) {
      await sandbox.files.remove(posixPath.join(targetRoot, entry.relativePath));
    }
  }

  private static toPosixPath(path: string): string {
    return path.split(sep).join("/");
  }

  private static buildPrompt(text: string, session: SessionRecord): string {
    const parts = [session.additionalInstructions, session.model ? `Model: ${session.model}` : undefined,
      session.mode ? `Mode: ${session.mode}` : undefined,
      session.thoughtLevel ? `Thought level: ${session.thoughtLevel}` : undefined,
      text].filter(Boolean);
    return parts.join("\n\n");
  }

  static listFromDB(): Array<{
    id: string;
    projectId: string;
    agentType: string;
    status: string;
    createdAt: string;
  }> {
    return db
      .select()
      .from(sandboxes)
      .all()
      .map((row) => ({
        id: row.id,
        projectId: row.projectId || "",
        agentType: row.agentType,
        status: row.status,
        createdAt: row.createdAt,
      }));
  }
}
