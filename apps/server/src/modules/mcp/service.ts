import { db } from "../../db";
import { mcpServers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import type { McpServerProfile } from "../../types";
import { spawn, type Subprocess } from "bun";

export type { McpServerProfile };

const activeProcesses = new Map<string, Subprocess>();

export abstract class McpServerService {
  static mapRow(row: any): McpServerProfile {
    return {
      id: row.id,
      name: row.name,
      command: row.command,
      args: JSON.parse(row.args || "[]"),
      env: JSON.parse(row.env || "{}"),
      enabled: row.enabled === "true",
      scope: row.scope as "global" | "project",
      projectId: row.projectId || undefined,
      organizationId: row.organizationId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  static create(data: {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    scope?: "global" | "project";
    projectId?: string;
    organizationId?: string;
  }): McpServerProfile {
    const id = generateId("mcp");
    const now = new Date().toISOString();

    db.insert(mcpServers)
      .values({
        id,
        name: data.name,
        command: data.command,
        args: JSON.stringify(data.args || []),
        env: JSON.stringify(data.env || {}),
        enabled: "true",
        scope: data.scope || "global",
        projectId: data.projectId || null,
        organizationId: data.organizationId || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const profile = {
      id,
      name: data.name,
      command: data.command,
      args: data.args || [],
      env: data.env || {},
      enabled: true,
      scope: data.scope || "global",
      projectId: data.projectId,
      organizationId: data.organizationId,
      createdAt: now,
      updatedAt: now,
    };

    McpServerService.startProcess(profile);

    return profile;
  }

  static get(id: string): McpServerProfile | undefined {
    const row = db.select().from(mcpServers).where(eq(mcpServers.id, id)).get();
    if (!row) return undefined;
    return McpServerService.mapRow(row);
  }

  static list(options?: {
    projectId?: string;
    organizationId?: string;
    scope?: "global" | "project";
  }): McpServerProfile[] {
    const allRows = db.select().from(mcpServers).all().map(McpServerService.mapRow);

    return allRows.filter((row) => {
      if (options?.scope && row.scope !== options.scope) return false;
      if (options?.projectId && row.projectId !== options.projectId) return false;
      if (options?.organizationId && row.organizationId !== options.organizationId) return false;
      return true;
    });
  }

  static listGlobal(): McpServerProfile[] {
    return db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.scope, "global"))
      .all()
      .map(McpServerService.mapRow);
  }

  static listByProject(projectId: string): McpServerProfile[] {
    return db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, projectId))
      .all()
      .map(McpServerService.mapRow);
  }

  static update(
    id: string,
    data: Partial<{
      name: string;
      command: string;
      args: string[];
      env: Record<string, string>;
      enabled: boolean;
      scope: "global" | "project";
    }>,
  ): McpServerProfile | undefined {
    const existing = McpServerService.get(id);
    if (!existing) return undefined;

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.command !== undefined) updates.command = data.command;
    if (data.args !== undefined) updates.args = JSON.stringify(data.args);
    if (data.env !== undefined) updates.env = JSON.stringify(data.env);
    if (data.enabled !== undefined) updates.enabled = String(data.enabled);
    if (data.scope !== undefined) updates.scope = data.scope;

    const result = db.update(mcpServers).set(updates).where(eq(mcpServers.id, id)).run();
    if (result.changes === 0) return undefined;

    const updated = McpServerService.get(id)!;

    if (data.command !== undefined || data.args !== undefined || data.env !== undefined) {
      McpServerService.stopProcess(id);
      if (updated.enabled) McpServerService.startProcess(updated);
    } else if (data.enabled === true) {
      McpServerService.startProcess(updated);
    } else if (data.enabled === false) {
      McpServerService.stopProcess(id);
    }

    return updated;
  }

  static delete(id: string): boolean {
    McpServerService.stopProcess(id);
    const result = db.delete(mcpServers).where(eq(mcpServers.id, id)).run();
    return result.changes > 0;
  }

  static toggleEnabled(id: string, enabled: boolean): McpServerProfile | undefined {
    const existing = McpServerService.get(id);
    if (!existing) return undefined;

    const result = db
      .update(mcpServers)
      .set({ enabled: String(enabled), updatedAt: new Date().toISOString() })
      .where(eq(mcpServers.id, id))
      .run();

    if (result.changes === 0) return undefined;

    if (enabled) {
      const profile = McpServerService.get(id)!;
      McpServerService.startProcess(profile);
    } else {
      McpServerService.stopProcess(id);
    }

    return McpServerService.get(id);
  }

  static isProcessRunning(id: string): boolean {
    const proc = activeProcesses.get(id);
    if (!proc) return false;
    try {
      return proc.pid !== undefined;
    } catch {
      return false;
    }
  }

  private static startProcess(profile: McpServerProfile): void {
    if (activeProcesses.has(profile.id)) return;

    try {
      const cmdArgs = [profile.command, ...profile.args];
      const proc = spawn({
        cmd: cmdArgs,
        env: { ...process.env, ...profile.env },
        stdout: "pipe",
        stderr: "pipe",
      });
      activeProcesses.set(profile.id, proc);
    } catch {
      // Process failed to start, but we still mark it enabled in DB
    }
  }

  private static stopProcess(id: string): void {
    const proc = activeProcesses.get(id);
    if (!proc) return;
    try {
      proc.kill();
    } catch {
      // Process may have already exited
    }
    activeProcesses.delete(id);
  }
}
