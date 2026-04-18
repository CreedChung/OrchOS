import type { AppDb } from "../../db/types";
import { mcpServers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import type { McpServerProfile } from "../../types";

export type { McpServerProfile };

const activeProcesses = new Map<string, any>();

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

  static async create(
    db: AppDb,
    data: {
      name: string;
      command: string;
      args?: string[];
      env?: Record<string, string>;
      scope?: "global" | "project";
      projectId?: string;
      organizationId?: string;
    },
  ): Promise<McpServerProfile> {
    const id = generateId("mcp");
    const now = new Date().toISOString();

    await db
      .insert(mcpServers)
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

  static async get(db: AppDb, id: string): Promise<McpServerProfile | undefined> {
    const row = await db.select().from(mcpServers).where(eq(mcpServers.id, id)).get();
    if (!row) return undefined;
    return McpServerService.mapRow(row);
  }

  static async list(
    db: AppDb,
    options?: {
      projectId?: string;
      organizationId?: string;
      scope?: "global" | "project";
    },
  ): Promise<McpServerProfile[]> {
    const allRows = (await db.select().from(mcpServers).all()).map(McpServerService.mapRow);

    return allRows.filter((row) => {
      if (options?.scope && row.scope !== options.scope) return false;
      if (options?.projectId && row.projectId !== options.projectId) return false;
      if (options?.organizationId && row.organizationId !== options.organizationId) return false;
      return true;
    });
  }

  static async listGlobal(db: AppDb): Promise<McpServerProfile[]> {
    const rows = await db.select().from(mcpServers).where(eq(mcpServers.scope, "global")).all();
    return rows.map(McpServerService.mapRow);
  }

  static async listByProject(db: AppDb, projectId: string): Promise<McpServerProfile[]> {
    const rows = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, projectId))
      .all();
    return rows.map(McpServerService.mapRow);
  }

  static async update(
    db: AppDb,
    id: string,
    data: Partial<{
      name: string;
      command: string;
      args: string[];
      env: Record<string, string>;
      enabled: boolean;
      scope: "global" | "project";
    }>,
  ): Promise<McpServerProfile | undefined> {
    const existing = await McpServerService.get(db, id);
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

    const result = await db.update(mcpServers).set(updates).where(eq(mcpServers.id, id)).run();
    if (getRowsAffected(result) === 0) return undefined;

    const updated = (await McpServerService.get(db, id))!;

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

  static async delete(db: AppDb, id: string): Promise<boolean> {
    McpServerService.stopProcess(id);
    const result = await db.delete(mcpServers).where(eq(mcpServers.id, id)).run();
    return getRowsAffected(result) > 0;
  }

  static async toggleEnabled(
    db: AppDb,
    id: string,
    enabled: boolean,
  ): Promise<McpServerProfile | undefined> {
    const existing = await McpServerService.get(db, id);
    if (!existing) return undefined;

    const result = await db
      .update(mcpServers)
      .set({ enabled: String(enabled), updatedAt: new Date().toISOString() })
      .where(eq(mcpServers.id, id))
      .run();

    if (getRowsAffected(result) === 0) return undefined;

    if (enabled) {
      const profile = (await McpServerService.get(db, id))!;
      McpServerService.startProcess(profile);
    } else {
      McpServerService.stopProcess(id);
    }

    return McpServerService.get(db, id);
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

  private static startProcess(_profile: McpServerProfile): void {
    try {
      console.log("Process management not available in Worker");
      return;
    } catch {
      console.log("Process management not available in Worker");
    }
  }

  private static stopProcess(_id: string): void {
    try {
      console.log("Process management not available in Worker");
      return;
    } catch {
      console.log("Process management not available in Worker");
    }
  }
}
