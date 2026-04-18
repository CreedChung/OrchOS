import type { AppDb } from "../../db/types";
import { states, artifacts } from "../../db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { generateId, timestamp } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import { EventBus } from "../event/event-bus";
import type { StateEntry, Artifact, Status } from "../../types";
import type { StateModel } from "./model";

export abstract class StateService {
  static getArtifactObjectKey(goalId: string, artifactId: string, name: string): string {
    return `goals/${goalId}/artifacts/${artifactId}/${name}`;
  }

  static getArtifactDownloadUrl(goalId: string, artifactId: string, name: string): string {
    return `/api/storage/artifacts/${StateService.getArtifactObjectKey(goalId, artifactId, name)}`;
  }

  static async createState(
    db: AppDb,
    goalId: string,
    label: string,
    status: Status,
    actions?: string[],
  ): Promise<StateEntry> {
    const id = generateId("state");
    const now = timestamp();
    const actionsJson = actions ? JSON.stringify(actions) : null;

    await db
      .insert(states)
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

  static async getState(db: AppDb, id: string): Promise<StateEntry | undefined> {
    const row = await db.select().from(states).where(eq(states.id, id)).get();
    if (!row) return undefined;
    return StateService.mapRowToState(row);
  }

  static async getStatesByGoal(db: AppDb, goalId: string): Promise<StateEntry[]> {
    const rows = await db
      .select()
      .from(states)
      .where(eq(states.goalId, goalId))
      .orderBy(asc(states.updatedAt))
      .all();
    return rows.map(StateService.mapRowToState);
  }

  static async updateState(
    db: AppDb,
    eventBus: EventBus,
    id: string,
    status: Status,
  ): Promise<StateEntry | undefined> {
    const current = await db.select().from(states).where(eq(states.id, id)).get();
    if (!current) return undefined;

    const oldStatus = current.status;
    const now = timestamp();

    await db.update(states).set({ status, updatedAt: now }).where(eq(states.id, id)).run();

    const updated = (await db.select().from(states).where(eq(states.id, id)).get())!;
    const mapped = StateService.mapRowToState(updated);

    await eventBus.emit(
      "state_changed",
      { stateId: id, oldStatus, newStatus: status },
      mapped.goalId,
    );
    return mapped;
  }

  static async deleteState(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(states).where(eq(states.id, id)).run();
    return getRowsAffected(result) > 0;
  }

  static async createArtifact(
    db: AppDb,
    goalId: string,
    name: string,
    type: Artifact["type"],
    status: Status,
    detail?: string,
  ): Promise<Artifact> {
    const id = generateId("art");
    const now = timestamp();

    await db
      .insert(artifacts)
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

    return {
      id,
      goalId,
      name,
      type,
      status,
      detail,
      updatedAt: now,
      downloadUrl:
        type === "file" ? StateService.getArtifactDownloadUrl(goalId, id, name) : undefined,
    };
  }

  static async getArtifactsByGoal(db: AppDb, goalId: string): Promise<Artifact[]> {
    const rows = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.goalId, goalId))
      .orderBy(desc(artifacts.updatedAt))
      .all();
    return rows.map(StateService.mapRowToArtifact);
  }

  static async updateArtifact(
    db: AppDb,
    id: string,
    patch: StateModel["artifactUpdateBody"],
  ): Promise<Artifact | undefined> {
    const current = await db.select().from(artifacts).where(eq(artifacts.id, id)).get();
    if (!current) return undefined;

    const updates: Partial<typeof artifacts.$inferInsert> = {};
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.detail !== undefined) updates.detail = patch.detail;

    if (Object.keys(updates).length === 0) return StateService.mapRowToArtifact(current);

    updates.updatedAt = timestamp();
    await db.update(artifacts).set(updates).where(eq(artifacts.id, id)).run();

    const updated = (await db.select().from(artifacts).where(eq(artifacts.id, id)).get())!;
    return StateService.mapRowToArtifact(updated);
  }

  static async deleteArtifact(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(artifacts).where(eq(artifacts.id, id)).run();
    return getRowsAffected(result) > 0;
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
      downloadUrl:
        row.type === "file"
          ? StateService.getArtifactDownloadUrl(row.goalId, row.id, row.name)
          : undefined,
    };
  }
}
