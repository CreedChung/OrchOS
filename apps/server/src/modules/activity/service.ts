import { db } from "../../db";
import { activities } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timeLabel } from "../../utils";
import type { ActivityEntry } from "../../types";

export abstract class ActivityService {
  static add(
    goalId: string,
    agent: string,
    action: string,
    detail?: string,
    reasoning?: string,
    diff?: string,
  ): ActivityEntry {
    const id = generateId("act");
    const time = timeLabel();

    db.insert(activities)
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

    return { id, goalId, timestamp: time, agent, action, detail, reasoning, diff };
  }

  static getByGoal(goalId: string, limit: number = 50): ActivityEntry[] {
    return db
      .select()
      .from(activities)
      .where(eq(activities.goalId, goalId))
      .orderBy(desc(activities.id))
      .limit(limit)
      .all()
      .map(ActivityService.mapRow);
  }

  static getAll(limit: number = 50): ActivityEntry[] {
    return db
      .select()
      .from(activities)
      .orderBy(desc(activities.id))
      .limit(limit)
      .all()
      .map(ActivityService.mapRow);
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
