import { db } from "../../db"
import { projects } from "../../db/schema"
import { eq, desc } from "drizzle-orm"
import { generateId, timestamp } from "../../utils"
import type { Project } from "../../types"
import type { ProjectModel } from "./model"

export abstract class ProjectService {
  static create(name: string, path: string): Project {
    const id = generateId("proj")
    const now = timestamp()

    db.insert(projects).values({ id, name, path, createdAt: now }).run()

    return { id, name, path, createdAt: now }
  }

  static get(id: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.id, id)).get()
    if (!row) return undefined
    return ProjectService.mapRow(row)
  }

  static getByPath(path: string): Project | undefined {
    const row = db.select().from(projects).where(eq(projects.path, path)).get()
    if (!row) return undefined
    return ProjectService.mapRow(row)
  }

  static list(): Project[] {
    return db.select().from(projects).orderBy(desc(projects.createdAt)).all().map(ProjectService.mapRow)
  }

  static update(id: string, patch: ProjectModel["updateBody"]): Project | undefined {
    const updates: Partial<typeof projects.$inferInsert> = {}
    if (patch.name !== undefined) updates.name = patch.name
    if (patch.path !== undefined) updates.path = patch.path

    if (Object.keys(updates).length === 0) return ProjectService.get(id)

    db.update(projects).set(updates).where(eq(projects.id, id)).run()
    return ProjectService.get(id)
  }

  static delete(id: string): boolean {
    const result = db.delete(projects).where(eq(projects.id, id)).run()
    return result.changes > 0
  }

  static mapRow(row: typeof projects.$inferSelect): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      createdAt: row.createdAt,
    }
  }
}
