import { generateId, timestamp } from "./utils"
import { getDb } from "./db"

export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
}

class ProjectManager {
  create(name: string, path: string): Project {
    const db = getDb()
    const id = generateId("proj")
    const now = timestamp()

    db.run(
      `INSERT INTO projects (id, name, path, created_at) VALUES (?, ?, ?, ?)`,
      [id, name, path, now]
    )

    return { id, name, path, createdAt: now }
  }

  get(id: string): Project | undefined {
    const db = getDb()
    const row = db.query("SELECT * FROM projects WHERE id = ?").get(id) as any
    if (!row) return undefined
    return this.mapRowToProject(row)
  }

  getByPath(path: string): Project | undefined {
    const db = getDb()
    const row = db.query("SELECT * FROM projects WHERE path = ?").get(path) as any
    if (!row) return undefined
    return this.mapRowToProject(row)
  }

  list(): Project[] {
    const db = getDb()
    const rows = db.query("SELECT * FROM projects ORDER BY created_at DESC").all() as any[]
    return rows.map(this.mapRowToProject)
  }

  update(id: string, patch: Partial<Pick<Project, "name" | "path">>): Project | undefined {
    const db = getDb()
    const updates: string[] = []
    const values: any[] = []

    if (patch.name !== undefined) {
      updates.push("name = ?")
      values.push(patch.name)
    }
    if (patch.path !== undefined) {
      updates.push("path = ?")
      values.push(patch.path)
    }

    if (updates.length === 0) return this.get(id)

    values.push(id)
    db.run(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`, values)

    return this.get(id)
  }

  delete(id: string): boolean {
    const db = getDb()
    const result = db.run("DELETE FROM projects WHERE id = ?", [id])
    return result.changes > 0
  }

  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      createdAt: row.created_at,
    }
  }
}

export const projectManager = new ProjectManager()
