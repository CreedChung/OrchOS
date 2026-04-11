import type { ActivityEntry } from "./types"
import { generateId, timeLabel, timestamp } from "./utils"
import { getDb } from "./db"

class ActivityLog {
  add(goalId: string, agent: string, action: string, detail?: string, reasoning?: string): ActivityEntry {
    const db = getDb()
    const id = generateId("act")
    const time = timeLabel()
    const now = timestamp()

    db.run(
      `INSERT INTO activities (id, goal_id, timestamp, agent, action, detail, reasoning) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, goalId, time, agent, action, detail || null, reasoning || null]
    )

    return {
      id,
      goalId,
      timestamp: time,
      agent,
      action,
      detail,
      reasoning,
    }
  }

  getByGoal(goalId: string, limit: number = 50): ActivityEntry[] {
    const db = getDb()
    const rows = db.query(
      "SELECT * FROM activities WHERE goal_id = ? ORDER BY rowid DESC LIMIT ?"
    ).all(goalId, limit) as any[]
    return rows.map(this.mapRowToActivity)
  }

  getAll(limit: number = 50): ActivityEntry[] {
    const db = getDb()
    const rows = db.query("SELECT * FROM activities ORDER BY rowid DESC LIMIT ?").all(limit) as any[]
    return rows.map(this.mapRowToActivity)
  }

  private mapRowToActivity(row: any): ActivityEntry {
    return {
      id: row.id,
      goalId: row.goal_id,
      timestamp: row.timestamp,
      agent: row.agent,
      action: row.action,
      detail: row.detail || undefined,
      reasoning: row.reasoning || undefined,
    }
  }
}

export const activityLog = new ActivityLog()
