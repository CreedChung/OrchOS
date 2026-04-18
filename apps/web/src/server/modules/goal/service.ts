import type { AppDb } from "../../db/types";
import { goals } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "../../utils";
import { type EventBus } from "../event/event-bus";
import { StateService } from "../state/service";
import { getRowsAffected } from "../../db/utils";
import type { Goal } from "../../types";
import type { GoalModel } from "./model";

export abstract class GoalService {
  static async create(db: AppDb, eventBus: EventBus, req: GoalModel["createBody"]): Promise<Goal> {
    const now = timestamp();
    const id = generateId("goal");

    await db
      .insert(goals)
      .values({
        id,
        title: req.title,
        description: req.description ?? null,
        successCriteria: JSON.stringify(req.successCriteria),
        constraints: JSON.stringify(req.constraints ?? []),
        status: "active",
        projectId: req.projectId ?? null,
        commandId: req.commandId ?? null,
        watchers: JSON.stringify(req.watchers ?? []),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const goal = await GoalService.get(db, id);
    await eventBus.emit("goal_created", { goalId: goal!.id, title: goal!.title }, goal!.id);
    return goal!;
  }

  static async get(db: AppDb, id: string): Promise<Goal | undefined> {
    const row = await db.select().from(goals).where(eq(goals.id, id)).get();
    if (!row) return undefined;
    return GoalService.mapRow(row);
  }

  static async list(db: AppDb): Promise<Goal[]> {
    const rows = await db.select().from(goals).orderBy(desc(goals.createdAt)).all();
    return rows.map(GoalService.mapRow);
  }

  static async update(
    db: AppDb,
    eventBus: EventBus,
    id: string,
    patch: GoalModel["updateBody"],
  ): Promise<Goal | undefined> {
    const goal = await GoalService.get(db, id);
    if (!goal) return undefined;

    const updates: Partial<typeof goals.$inferInsert> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.successCriteria !== undefined)
      updates.successCriteria = JSON.stringify(patch.successCriteria);
    if (patch.constraints !== undefined) updates.constraints = JSON.stringify(patch.constraints);
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.projectId !== undefined) updates.projectId = patch.projectId;
    if (patch.commandId !== undefined) updates.commandId = patch.commandId;
    if (patch.watchers !== undefined) updates.watchers = JSON.stringify(patch.watchers);

    if (Object.keys(updates).length === 0) return goal;

    updates.updatedAt = timestamp();
    await db.update(goals).set(updates).where(eq(goals.id, id)).run();

    const updated = (await GoalService.get(db, id))!;
    if (patch.status === "completed") {
      await eventBus.emit("goal_completed", { goalId: id }, id);
    }
    return updated;
  }

  static async delete(db: AppDb, _eventBus: EventBus, id: string): Promise<boolean> {
    const goal = await GoalService.get(db, id);
    if (!goal) return false;

    const result = await db.delete(goals).where(eq(goals.id, id)).run();
    return getRowsAffected(result) > 0;
  }

  static async checkCompletion(db: AppDb, _eventBus: EventBus, id: string): Promise<boolean> {
    const goal = await GoalService.get(db, id);
    if (!goal || goal.status !== "active") return false;

    const states = await StateService.getStatesByGoal(db, id);

    if (states.length === 0) return false;

    const allFinal = states.every((s) => s.status !== "pending" && s.status !== "running");
    const allSuccess = states.every((s) => s.status === "success");

    return allFinal && allSuccess;
  }

  static mapRow(row: typeof goals.$inferSelect): Goal {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      successCriteria: JSON.parse(row.successCriteria),
      constraints: JSON.parse(row.constraints),
      status: row.status as Goal["status"],
      projectId: row.projectId ?? undefined,
      commandId: row.commandId ?? undefined,
      watchers: JSON.parse(row.watchers || "[]"),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
