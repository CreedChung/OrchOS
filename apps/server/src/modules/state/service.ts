import { db } from "../../db";
import { states, artifacts } from "../../db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { generateId, timestamp } from "../../utils";
import { eventBus } from "../event/event-bus";
import type { StateEntry, Artifact, Status } from "../../types";
import type { StateModel } from "./model";

export abstract class StateService {
  static createState(
    goalId: string,
    label: string,
    status: Status,
    actions?: string[],
  ): StateEntry {
    const id = generateId("state");
    const now = timestamp();
    const actionsJson = actions ? JSON.stringify(actions) : null;

    db.insert(states)
      .values({
        id,
        goalId,
        label,
        status,
        actions: actionsJson,
        updatedAt: now,
      })
      .run();

    return { id, goalId, label, status, actions, updatedAt: now };
  }

  static getState(id: string): StateEntry | undefined {
    const row = db.select().from(states).where(eq(states.id, id)).get();
    if (!row) return undefined;
    return StateService.mapRowToState(row);
  }

  static getStatesByGoal(goalId: string): StateEntry[] {
    return db
      .select()
      .from(states)
      .where(eq(states.goalId, goalId))
      .orderBy(asc(states.updatedAt))
      .all()
      .map(StateService.mapRowToState);
  }

  static updateState(id: string, status: Status): StateEntry | undefined {
    const current = db.select().from(states).where(eq(states.id, id)).get();
    if (!current) return undefined;

    const oldStatus = current.status;
    const now = timestamp();

    db.update(states).set({ status, updatedAt: now }).where(eq(states.id, id)).run();

    const updated = db.select().from(states).where(eq(states.id, id)).get()!;
    const mapped = StateService.mapRowToState(updated);

    eventBus.emit("state_changed", { stateId: id, oldStatus, newStatus: status }, mapped.goalId);
    return mapped;
  }

  static deleteState(id: string): boolean {
    const result = db.delete(states).where(eq(states.id, id)).run();
    return result.changes > 0;
  }

  static createArtifact(
    goalId: string,
    name: string,
    type: Artifact["type"],
    status: Status,
    detail?: string,
  ): Artifact {
    const id = generateId("art");
    const now = timestamp();

    db.insert(artifacts)
      .values({
        id,
        goalId,
        name,
        type,
        status,
        detail: detail ?? null,
        updatedAt: now,
      })
      .run();

    return { id, goalId, name, type, status, detail, updatedAt: now };
  }

  static getArtifactsByGoal(goalId: string): Artifact[] {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.goalId, goalId))
      .orderBy(desc(artifacts.updatedAt))
      .all()
      .map(StateService.mapRowToArtifact);
  }

  static updateArtifact(id: string, patch: StateModel["artifactUpdateBody"]): Artifact | undefined {
    const current = db.select().from(artifacts).where(eq(artifacts.id, id)).get();
    if (!current) return undefined;

    const updates: Partial<typeof artifacts.$inferInsert> = {};
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.detail !== undefined) updates.detail = patch.detail;

    if (Object.keys(updates).length === 0) return StateService.mapRowToArtifact(current);

    updates.updatedAt = timestamp();
    db.update(artifacts).set(updates).where(eq(artifacts.id, id)).run();

    const updated = db.select().from(artifacts).where(eq(artifacts.id, id)).get()!;
    return StateService.mapRowToArtifact(updated);
  }

  static deleteArtifact(id: string): boolean {
    const result = db.delete(artifacts).where(eq(artifacts.id, id)).run();
    return result.changes > 0;
  }

  static mapRowToState(row: typeof states.$inferSelect): StateEntry {
    return {
      id: row.id,
      goalId: row.goalId,
      label: row.label,
      status: row.status as Status,
      actions: row.actions ? JSON.parse(row.actions) : undefined,
      updatedAt: row.updatedAt,
    };
  }

  static mapRowToArtifact(row: typeof artifacts.$inferSelect): Artifact {
    return {
      id: row.id,
      goalId: row.goalId,
      name: row.name,
      type: row.type as Artifact["type"],
      status: row.status as Status,
      detail: row.detail ?? undefined,
      updatedAt: row.updatedAt,
    };
  }
}
