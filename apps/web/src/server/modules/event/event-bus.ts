import type { Event, EventType } from "../../types";
import { generateId, timestamp } from "../../utils";
import type { AppDb } from "../../db/types";
import { events } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

type EventHandler = (event: Event) => void;
type RealtimePublisher = (event: Event) => Promise<void>;

let realtimePublisher: RealtimePublisher | undefined;

export function configureRealtimePublisher(publisher?: RealtimePublisher) {
  realtimePublisher = publisher;
}

export class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  private allHandlers: EventHandler[] = [];
  private db: AppDb;

  constructor(db: AppDb) {
    this.db = db;
  }

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

  async emit(
    type: EventType,
    payload: Record<string, unknown> = {},
    goalId?: string,
  ): Promise<Event> {
    const event: Event = {
      id: generateId("evt"),
      type,
      goalId,
      payload,
      timestamp: timestamp(),
    };

    await this.db
      .insert(events)
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
    await realtimePublisher?.(event);

    return event;
  }

  async getHistory(goalId?: string, limit: number = 50): Promise<Event[]> {
    let query = this.db
      .select()
      .from(events)
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .$dynamic();

    if (goalId) {
      query = query.where(eq(events.goalId, goalId));
    }

    const rows = await query.all();
    return rows.map((row) => ({
      id: row.id,
      type: row.type as EventType,
      goalId: row.goalId ?? undefined,
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
    }));
  }

  async clear(): Promise<void> {
    await this.db.delete(events).run();
  }
}

export function createEventBus(db: AppDb): EventBus {
  return new EventBus(db);
}
