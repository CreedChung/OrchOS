import type { StateEntry, Artifact, Status } from "./types"
import { generateId, timestamp } from "./utils"
import { eventBus } from "./event-bus"
import { getDb } from "./db"

class StateEngine {
  createState(goalId: string, label: string, status: Status, actions?: string[]): StateEntry {
    const db = getDb()
    const id = generateId("state")
    const now = timestamp()
    const actionsJson = actions ? JSON.stringify(actions) : null

    db.run(
      `INSERT INTO states (id, goal_id, label, status, actions, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, goalId, label, status, actionsJson, now]
    )

    return {
      id,
      goalId,
      label,
      status,
      actions,
      updatedAt: now,
    }
  }

  getState(id: string): StateEntry | undefined {
    const db = getDb()
    const row = db.query("SELECT * FROM states WHERE id = ?").get(id) as any
    if (!row) return undefined
    return this.mapRowToState(row)
  }

  getStatesByGoal(goalId: string): StateEntry[] {
    const db = getDb()
    const rows = db.query("SELECT * FROM states WHERE goal_id = ? ORDER BY updated_at ASC").all(goalId) as any[]
    return rows.map(this.mapRowToState)
  }

  updateState(id: string, status: Status): StateEntry | undefined {
    const db = getDb()
    const current = db.query("SELECT * FROM states WHERE id = ?").get(id) as any
    if (!current) return undefined

    const oldStatus = current.status
    const now = timestamp()

    db.run("UPDATE states SET status = ?, updated_at = ? WHERE id = ?", [status, now, id])

    const updated = db.query("SELECT * FROM states WHERE id = ?").get(id) as any
    const mapped = this.mapRowToState(updated)

    eventBus.emit("state_changed", { stateId: id, oldStatus, newStatus: status }, mapped.goalId)
    return mapped
  }

  deleteState(id: string): boolean {
    const db = getDb()
    const result = db.run("DELETE FROM states WHERE id = ?", [id])
    return result.changes > 0
  }

  createArtifact(goalId: string, name: string, type: Artifact["type"], status: Status, detail?: string): Artifact {
    const db = getDb()
    const id = generateId("art")
    const now = timestamp()

    db.run(
      `INSERT INTO artifacts (id, goal_id, name, type, status, detail, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, goalId, name, type, status, detail || null, now]
    )

    return {
      id,
      goalId,
      name,
      type,
      status,
      detail,
      updatedAt: now,
    }
  }

  getArtifactsByGoal(goalId: string): Artifact[] {
    const db = getDb()
    const rows = db.query("SELECT * FROM artifacts WHERE goal_id = ? ORDER BY updated_at DESC").all(goalId) as any[]
    return rows.map(this.mapRowToArtifact)
  }

  updateArtifact(id: string, patch: Partial<Pick<Artifact, "status" | "detail">>): Artifact | undefined {
    const db = getDb()
    const current = db.query("SELECT * FROM artifacts WHERE id = ?").get(id) as any
    if (!current) return undefined

    const updates: string[] = []
    const values: any[] = []

    if (patch.status !== undefined) {
      updates.push("status = ?")
      values.push(patch.status)
    }
    if (patch.detail !== undefined) {
      updates.push("detail = ?")
      values.push(patch.detail)
    }

    if (updates.length === 0) return this.mapRowToArtifact(current)

    updates.push("updated_at = ?")
    values.push(timestamp())
    values.push(id)

    db.run(`UPDATE artifacts SET ${updates.join(", ")} WHERE id = ?`, values)

    const updated = db.query("SELECT * FROM artifacts WHERE id = ?").get(id) as any
    return this.mapRowToArtifact(updated)
  }

  deleteArtifact(id: string): boolean {
    const db = getDb()
    const result = db.run("DELETE FROM artifacts WHERE id = ?", [id])
    return result.changes > 0
  }

  private mapRowToState(row: any): StateEntry {
    return {
      id: row.id,
      goalId: row.goal_id,
      label: row.label,
      status: row.status as Status,
      actions: row.actions ? JSON.parse(row.actions) : undefined,
      updatedAt: row.updated_at,
    }
  }

  private mapRowToArtifact(row: any): Artifact {
    return {
      id: row.id,
      goalId: row.goal_id,
      name: row.name,
      type: row.type as Artifact["type"],
      status: row.status as Status,
      detail: row.detail || undefined,
      updatedAt: row.updated_at,
    }
  }
}

export const stateEngine = new StateEngine()
