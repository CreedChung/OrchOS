import type { Event, EventType } from "@/types";
import { generateId, timestamp } from "@/utils";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

type EventHandler = (event: Event) => void;

class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private allHandlers: EventHandler[] = [];

  on(type: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    return () => {
      const list = this.handlers.get(type);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
    };
  }

  onAny(handler: EventHandler): () => void {
    this.allHandlers.push(handler);
    return () => {
      const idx = this.allHandlers.indexOf(handler);
      if (idx >= 0) this.allHandlers.splice(idx, 1);
    };
  }

  emit(type: EventType, payload: Record<string, unknown> = {}, goalId?: string): Event {
    const event: Event = {
      id: generateId("evt"),
      type,
      goalId,
      payload,
      timestamp: timestamp(),
    };

    db.insert(events)
      .values({
        id: event.id,
        type: event.type,
        goalId: event.goalId ?? null,
        payload: JSON.stringify(event.payload),
        timestamp: event.timestamp,
      })
      .run();

    const typeHandlers = this.handlers.get(type) || [];
    for (const h of typeHandlers) h(event);
    for (const h of this.allHandlers) h(event);

    return event;
  }

  getHistory(goalId?: string, limit: number = 50): Event[] {
    let query = db.select().from(events).orderBy(desc(events.timestamp)).limit(limit).$dynamic();

    if (goalId) {
      query = query.where(eq(events.goalId, goalId));
    }

    return query.all().map((row) => ({
      id: row.id,
      type: row.type as EventType,
      goalId: row.goalId ?? undefined,
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
    }));
  }

  clear(): void {
    db.delete(events).run();
  }
}

export const eventBus = new EventBus();
