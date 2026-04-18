import type { AppDb } from "../../db/types";
import { activities } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timeLabel } from "../../utils";
import type { ActivityEntry } from "../../types";

export abstract class ActivityService {
  static async add(
    db: AppDb,
    goalId: string,
    agent: string,
    action: string,
    detail?: string,
    reasoning?: string,
    diff?: string,
  ): Promise<ActivityEntry> {
    const id = generateId("act");
    const time = timeLabel();

    await db
      .insert(activities)
      .values({
        id,
        goalId,
        timestamp: time,
        agent,
        action,
        detail: detail ?? null,
        reasoning: reasoning ?? null,
        diff: diff ?? null,
      })
      .run();

    return {
      id,
      goalId,
      timestamp: time,
      agent,
      action,
      detail,
      reasoning,
      diff,
    };
  }

  static async getByGoal(db: AppDb, goalId: string, limit: number = 50): Promise<ActivityEntry[]> {
    const rows = await db
      .select()
      .from(activities)
      .where(eq(activities.goalId, goalId))
      .orderBy(desc(activities.id))
      .limit(limit)
      .all();
    return rows.map(ActivityService.mapRow);
  }

  static async getAll(db: AppDb, limit: number = 50): Promise<ActivityEntry[]> {
    const rows = await db.select().from(activities).orderBy(desc(activities.id)).limit(limit).all();
    return rows.map(ActivityService.mapRow);
  }

  static mapRow(row: typeof activities.$inferSelect): ActivityEntry {
    return {
      id: row.id,
      goalId: row.goalId,
      timestamp: row.timestamp,
      agent: row.agent,
      action: row.action,
      detail: row.detail ?? undefined,
      reasoning: row.reasoning ?? undefined,
      diff: row.diff ?? undefined,
    };
  }
}
