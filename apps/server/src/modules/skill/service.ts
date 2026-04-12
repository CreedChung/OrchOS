import { db } from "../../db"
import { skills } from "../../db/schema"
import { eq } from "drizzle-orm"
import { generateId } from "../../utils"
import type { SkillProfile } from "../../types"

export type { SkillProfile }

export abstract class SkillService {
  static mapRow(row: any): SkillProfile {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
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
    description?: string
    scope?: "global" | "project"
    projectId?: string
    organizationId?: string
    enabled?: boolean
  }): SkillProfile {
    const id = generateId("skill")
    const now = new Date().toISOString()

    db.insert(skills).values({
      id,
      name: data.name,
      description: data.description || null,
      enabled: String(data.enabled ?? true),
      scope: data.scope || "global",
      projectId: data.projectId || null,
      organizationId: data.organizationId || null,
      createdAt: now,
      updatedAt: now,
    }).run()

    return {
      id,
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? true,
      scope: data.scope || "global",
      projectId: data.projectId,
      organizationId: data.organizationId,
      createdAt: now,
      updatedAt: now,
    }
  }

  static get(id: string): SkillProfile | undefined {
    const row = db.select().from(skills).where(eq(skills.id, id)).get()
    if (!row) return undefined
    return SkillService.mapRow(row)
  }

  static list(options?: {
    projectId?: string
    organizationId?: string
    scope?: "global" | "project"
  }): SkillProfile[] {
    const allRows = db.select().from(skills).all().map(SkillService.mapRow)

    return allRows.filter((row) => {
      if (options?.scope && row.scope !== options.scope) return false
      if (options?.projectId && row.projectId !== options.projectId) return false
      if (options?.organizationId && row.organizationId !== options.organizationId) return false
      return true
    })
  }

  static update(
    id: string,
    data: Partial<{
      name: string
      description: string
      enabled: boolean
      scope: "global" | "project"
    }>
  ): SkillProfile | undefined {
    const existing = SkillService.get(id)
    if (!existing) return undefined

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    }

    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.enabled !== undefined) updates.enabled = String(data.enabled)
    if (data.scope !== undefined) updates.scope = data.scope

    const result = db.update(skills).set(updates).where(eq(skills.id, id)).run()
    if (result.changes === 0) return undefined

    return SkillService.get(id)
  }

  static delete(id: string): boolean {
    const result = db.delete(skills).where(eq(skills.id, id)).run()
    return result.changes > 0
  }

  static toggleEnabled(id: string, enabled: boolean): SkillProfile | undefined {
    const result = db
      .update(skills)
      .set({ enabled: String(enabled), updatedAt: new Date().toISOString() })
      .where(eq(skills.id, id))
      .run()

    if (result.changes === 0) return undefined
    return SkillService.get(id)
  }
}
