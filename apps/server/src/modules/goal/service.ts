import { db } from "../../db";
import { goals, states } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "../../utils";
import { eventBus } from "../event/event-bus";
import type { Goal, Status } from "../../types";
import type { GoalModel } from "./model";

export abstract class GoalService {
  static create(req: GoalModel["createBody"]): Goal {
    const now = timestamp();
    const id = generateId("goal");

    db.insert(goals)
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

    const goal = GoalService.get(id);
    eventBus.emit("goal_created", { goalId: goal!.id, title: goal!.title }, goal!.id);
    return goal!;
  }

  static get(id: string): Goal | undefined {
    const row = db.select().from(goals).where(eq(goals.id, id)).get();
    if (!row) return undefined;
    return GoalService.mapRow(row);
  }

  static list(): Goal[] {
    return db.select().from(goals).orderBy(desc(goals.createdAt)).all().map(GoalService.mapRow);
  }

  static update(id: string, patch: GoalModel["updateBody"]): Goal | undefined {
    const goal = GoalService.get(id);
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
    db.update(goals).set(updates).where(eq(goals.id, id)).run();

    const updated = GoalService.get(id)!;
    if (patch.status === "completed") {
      eventBus.emit("goal_completed", { goalId: id }, id);
    }
    return updated;
  }

  static delete(id: string): boolean {
    const result = db.delete(goals).where(eq(goals.id, id)).run();
    return result.changes > 0;
  }

  static checkCompletion(id: string): boolean {
    const goal = GoalService.get(id);
    if (!goal || goal.status !== "active") return false;

    const stateRows = db
      .select({ status: states.status })
      .from(states)
      .where(eq(states.goalId, id))
      .all() as { status: Status }[];

    if (stateRows.length === 0) return false;

    const allFinal = stateRows.every((s) => s.status !== "pending" && s.status !== "running");
    const allSuccess = stateRows.every((s) => s.status === "success");

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
