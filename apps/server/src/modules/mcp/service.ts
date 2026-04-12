import { db } from "../../db"
import { mcpServers } from "../../db/schema"
import { eq, and, isNull, or } from "drizzle-orm"
import { generateId } from "../../utils"
import type { McpServerProfile } from "../../types"

export type { McpServerProfile }

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
    }
  }

  static create(data: {
    name: string
    command: string
    args?: string[]
    env?: Record<string, string>
    scope?: "global" | "project"
    projectId?: string
    organizationId?: string
  }): McpServerProfile {
    const id = generateId("mcp")
    const now = new Date().toISOString()

    db.insert(mcpServers).values({
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
    }).run()

    return {
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
    }
  }

  static get(id: string): McpServerProfile | undefined {
    const row = db.select().from(mcpServers).where(eq(mcpServers.id, id)).get()
    if (!row) return undefined
    return McpServerService.mapRow(row)
  }

  static list(options?: {
    projectId?: string
    organizationId?: string
    scope?: "global" | "project"
  }): McpServerProfile[] {
    const allRows = db.select().from(mcpServers).all().map(McpServerService.mapRow)

    return allRows.filter((row) => {
      if (options?.scope && row.scope !== options.scope) return false
      if (options?.projectId && row.projectId !== options.projectId) return false
      if (options?.organizationId && row.organizationId !== options.organizationId) return false
      return true
    })
  }

  static listGlobal(): McpServerProfile[] {
    return db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.scope, "global"))
      .all()
      .map(McpServerService.mapRow)
  }

  static listByProject(projectId: string): McpServerProfile[] {
    return db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, projectId))
      .all()
      .map(McpServerService.mapRow)
  }

  static update(
    id: string,
    data: Partial<{
      name: string
      command: string
      args: string[]
      env: Record<string, string>
      enabled: boolean
      scope: "global" | "project"
    }>
  ): McpServerProfile | undefined {
    const existing = McpServerService.get(id)
    if (!existing) return undefined

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    }

    if (data.name !== undefined) updates.name = data.name
    if (data.command !== undefined) updates.command = data.command
    if (data.args !== undefined) updates.args = JSON.stringify(data.args)
    if (data.env !== undefined) updates.env = JSON.stringify(data.env)
    if (data.enabled !== undefined) updates.enabled = String(data.enabled)
    if (data.scope !== undefined) updates.scope = data.scope

    const result = db.update(mcpServers).set(updates).where(eq(mcpServers.id, id)).run()
    if (result.changes === 0) return undefined

    return McpServerService.get(id)
  }

  static delete(id: string): boolean {
    const result = db.delete(mcpServers).where(eq(mcpServers.id, id)).run()
    return result.changes > 0
  }

  static toggleEnabled(id: string, enabled: boolean): McpServerProfile | undefined {
    const result = db
      .update(mcpServers)
      .set({ enabled: String(enabled), updatedAt: new Date().toISOString() })
      .where(eq(mcpServers.id, id))
      .run()

    if (result.changes === 0) return undefined
    return McpServerService.get(id)
  }
}
