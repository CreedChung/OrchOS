import type { Event, EventType } from "./types"
import { generateId, timestamp } from "./utils"
import { getDb } from "./db"

type EventHandler = (event: Event) => void

class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map()
  private allHandlers: EventHandler[] = []

  on(type: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)!.push(handler)
    return () => {
      const list = this.handlers.get(type)
      if (list) {
        const idx = list.indexOf(handler)
        if (idx >= 0) list.splice(idx, 1)
      }
    }
  }

  onAny(handler: EventHandler): () => void {
    this.allHandlers.push(handler)
    return () => {
      const idx = this.allHandlers.indexOf(handler)
      if (idx >= 0) this.allHandlers.splice(idx, 1)
    }
  }

  emit(type: EventType, payload: Record<string, unknown> = {}, goalId?: string): Event {
    const event: Event = {
      id: generateId("evt"),
      type,
      goalId,
      payload,
      timestamp: timestamp(),
    }

    // Persist to DB
    const db = getDb()
    db.run(
      `INSERT INTO events (id, type, goal_id, payload, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [event.id, event.type, event.goalId || null, JSON.stringify(event.payload), event.timestamp]
    )

    // Notify handlers
    const typeHandlers = this.handlers.get(type) || []
    for (const h of typeHandlers) h(event)
    for (const h of this.allHandlers) h(event)

    return event
  }

  getHistory(goalId?: string, limit: number = 50): Event[] {
    const db = getDb()
    let rows: any[]

    if (goalId) {
      rows = db.query("SELECT * FROM events WHERE goal_id = ? ORDER BY timestamp DESC LIMIT ?").all(goalId, limit) as any[]
    } else {
      rows = db.query("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?").all(limit) as any[]
    }

    return rows.map((row) => ({
      id: row.id,
      type: row.type as EventType,
      goalId: row.goal_id || undefined,
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
    }))
  }

  clear(): void {
    const db = getDb()
    db.run("DELETE FROM events")
  }
}

export const eventBus = new EventBus()
