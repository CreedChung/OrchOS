import type { Goal, CreateGoalRequest, Status } from "./types"
import { generateId, timestamp } from "./utils"
import { eventBus } from "./event-bus"
import { getDb } from "./db"

class GoalManager {
  create(req: CreateGoalRequest): Goal {
    const db = getDb()
    const now = timestamp()
    const id = generateId("goal")
    const successCriteria = JSON.stringify(req.successCriteria)
    const constraints = JSON.stringify(req.constraints || [])

    db.run(
      `INSERT INTO goals (id, title, description, success_criteria, constraints, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, req.title, req.description || null, successCriteria, constraints, now, now]
    )

    const goal = this.get(id)!
    eventBus.emit("goal_created", { goalId: goal.id, title: goal.title }, goal.id)
    return goal
  }

  get(id: string): Goal | undefined {
    const db = getDb()
    const row = db.query("SELECT * FROM goals WHERE id = ?").get(id) as any
    if (!row) return undefined
    return this.mapRowToGoal(row)
  }

  list(): Goal[] {
    const db = getDb()
    const rows = db.query("SELECT * FROM goals ORDER BY created_at DESC").all() as any[]
    return rows.map(this.mapRowToGoal)
  }

  update(id: string, patch: Partial<Pick<Goal, "title" | "description" | "successCriteria" | "constraints" | "status">>): Goal | undefined {
    const goal = this.get(id)
    if (!goal) return undefined

    const updates: string[] = []
    const values: any[] = []

    if (patch.title !== undefined) {
      updates.push("title = ?")
      values.push(patch.title)
    }
    if (patch.description !== undefined) {
      updates.push("description = ?")
      values.push(patch.description)
    }
    if (patch.successCriteria !== undefined) {
      updates.push("success_criteria = ?")
      values.push(JSON.stringify(patch.successCriteria))
    }
    if (patch.constraints !== undefined) {
      updates.push("constraints = ?")
      values.push(JSON.stringify(patch.constraints))
    }
    if (patch.status !== undefined) {
      updates.push("status = ?")
      values.push(patch.status)
    }

    if (updates.length === 0) return goal

    updates.push("updated_at = ?")
    values.push(timestamp())
    values.push(id)

    const db = getDb()
    db.run(`UPDATE goals SET ${updates.join(", ")} WHERE id = ?`, values)

    const updated = this.get(id)!
    if (patch.status === "completed") {
      eventBus.emit("goal_completed", { goalId: id }, id)
    }
    return updated
  }

  delete(id: string): boolean {
    const db = getDb()
    const result = db.run("DELETE FROM goals WHERE id = ?", [id])
    return result.changes > 0
  }

  checkCompletion(id: string): boolean {
    const goal = this.get(id)
    if (!goal || goal.status !== "active") return false

    const db = getDb()
    const states = db.query("SELECT status FROM states WHERE goal_id = ?").all(id) as { status: Status }[]

    if (states.length === 0) return false

    // Goal is complete when all non-pending states are success
    const allFinal = states.every(s => s.status !== "pending" && s.status !== "running")
    const allSuccess = states.every(s => s.status === "success")

    return allFinal && allSuccess
  }

  private mapRowToGoal(row: any): Goal {
    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      successCriteria: JSON.parse(row.success_criteria),
      constraints: JSON.parse(row.constraints),
      status: row.status as Goal["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export const goalManager = new GoalManager()
