import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { contextDiffs, contextSnapshots, memoryEntries } from "@/db/schema";
import type { ContextDiff, ContextSnapshot, MemoryEntry } from "@/types";
import { generateId, timestamp } from "@/utils";
import { ContextDiffUtil } from "@/modules/context/diff";
import { ContextSnapshotBuilder } from "@/modules/context/snapshot";
import { GoalService } from "@/modules/goal/service";
import { GraphService } from "@/modules/graph/service";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export abstract class ContextService {
  static createSnapshot(data: {
    goalId?: string;
    graphId?: string;
    attemptId?: string;
    kind?: string;
    payload: Record<string, unknown>;
  }): ContextSnapshot {
    const id = generateId("ctx");
    const createdAt = timestamp();

    db.insert(contextSnapshots)
      .values({
        id,
        parentSnapshotId: null,
        goalId: data.goalId || null,
        graphId: data.graphId || null,
        attemptId: data.attemptId || null,
        kind: data.kind || "goal_context",
        payloadJson: JSON.stringify(data.payload),
        createdAt,
      })
      .run();

    return ContextService.getSnapshot(id)!;
  }

  static deriveSnapshot(data: {
    parentSnapshotId: string;
    goalId?: string;
    graphId?: string;
    attemptId?: string;
    kind?: string;
    patch: Record<string, unknown>;
  }): ContextSnapshot | undefined {
    const parent = ContextService.getSnapshot(data.parentSnapshotId);
    if (!parent) return undefined;

    const payload = ContextDiffUtil.applyPatch(parent.payload, data.patch);
    const id = generateId("ctx");
    const createdAt = timestamp();

    db.insert(contextSnapshots)
      .values({
        id,
        parentSnapshotId: parent.id,
        goalId: data.goalId || parent.goalId || null,
        graphId: data.graphId || parent.graphId || null,
        attemptId: data.attemptId || null,
        kind: data.kind || parent.kind,
        payloadJson: JSON.stringify(payload),
        createdAt,
      })
      .run();

    db.insert(contextDiffs)
      .values({
        id: generateId("ctxdiff"),
        fromSnapshotId: parent.id,
        toSnapshotId: id,
        patchJson: JSON.stringify(data.patch),
        createdAt,
      })
      .run();

    return ContextService.getSnapshot(id);
  }

  static getSnapshot(id: string): ContextSnapshot | undefined {
    const row = db.select().from(contextSnapshots).where(eq(contextSnapshots.id, id)).get();
    if (!row) return undefined;

    return {
      id: row.id,
      parentSnapshotId: row.parentSnapshotId || undefined,
      goalId: row.goalId || undefined,
      graphId: row.graphId || undefined,
      attemptId: row.attemptId || undefined,
      kind: row.kind,
      payload: parseJson(row.payloadJson),
      createdAt: row.createdAt,
    };
  }

  static listSnapshotsByGoal(goalId: string): ContextSnapshot[] {
    return db
      .select()
      .from(contextSnapshots)
      .where(eq(contextSnapshots.goalId, goalId))
      .all()
      .map((row) => ({
        id: row.id,
        parentSnapshotId: row.parentSnapshotId || undefined,
        goalId: row.goalId || undefined,
        graphId: row.graphId || undefined,
        attemptId: row.attemptId || undefined,
        kind: row.kind,
        payload: parseJson(row.payloadJson),
        createdAt: row.createdAt,
      }));
  }

  static diffSnapshots(fromSnapshotId: string, toSnapshotId: string): ContextDiff | undefined {
    const existing = db
      .select()
      .from(contextDiffs)
      .where(
        and(
          eq(contextDiffs.fromSnapshotId, fromSnapshotId),
          eq(contextDiffs.toSnapshotId, toSnapshotId),
        ),
      )
      .get();

    if (existing) {
      return {
        id: existing.id,
        fromSnapshotId: existing.fromSnapshotId,
        toSnapshotId: existing.toSnapshotId,
        patch: parseJson(existing.patchJson),
        createdAt: existing.createdAt,
      };
    }

    const from = ContextService.getSnapshot(fromSnapshotId);
    const to = ContextService.getSnapshot(toSnapshotId);
    if (!from || !to) return undefined;

    return {
      id: generateId("ctxdiff_preview"),
      fromSnapshotId,
      toSnapshotId,
      patch: ContextDiffUtil.diff(from.payload, to.payload),
      createdAt: timestamp(),
    };
  }

  static rollbackTo(snapshotId: string): ContextSnapshot | undefined {
    const snapshot = ContextService.getSnapshot(snapshotId);
    if (!snapshot) return undefined;

    const goalPayload = snapshot.payload.goal as { title?: string; description?: string; status?: "active" | "completed" | "paused" } | undefined;
    if (snapshot.goalId && goalPayload) {
      GoalService.update(snapshot.goalId, {
        title: goalPayload.title,
        description: goalPayload.description,
        status: goalPayload.status,
      });
    }

    if (snapshot.graphId) {
      const graph = GraphService.get(snapshot.graphId);
      if (graph?.contextSnapshotId !== snapshot.id) {
        db.update(contextSnapshots)
          .set({ parentSnapshotId: graph?.contextSnapshotId || null })
          .where(eq(contextSnapshots.id, snapshot.id))
          .run();
      }
    }

    return snapshot;
  }

  static buildGoalContext(goalId: string): Record<string, unknown> {
    return ContextSnapshotBuilder.buildGoalPayload(goalId);
  }

  static buildHandoffContext(subject: string): Record<string, unknown> {
    return ContextSnapshotBuilder.buildHandoffPayload(subject);
  }

  static remember(data: {
    scope: string;
    scopeId: string;
    key: string;
    value: Record<string, unknown>;
  }): MemoryEntry {
    const existing = db
      .select()
      .from(memoryEntries)
      .where(
        and(
          eq(memoryEntries.scope, data.scope),
          eq(memoryEntries.scopeId, data.scopeId),
          eq(memoryEntries.key, data.key),
        ),
      )
      .get();
    const now = timestamp();

    if (existing) {
      db.update(memoryEntries)
        .set({ valueJson: JSON.stringify(data.value), updatedAt: now })
        .where(eq(memoryEntries.id, existing.id))
        .run();
      return ContextService.listMemory(data.scope, data.scopeId).find((item) => item.id === existing.id)!;
    }

    const id = generateId("mem");
    db.insert(memoryEntries)
      .values({
        id,
        scope: data.scope,
        scopeId: data.scopeId,
        key: data.key,
        valueJson: JSON.stringify(data.value),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return ContextService.listMemory(data.scope, data.scopeId).find((item) => item.id === id)!;
  }

  static listMemory(scope: string, scopeId: string): MemoryEntry[] {
    return db
      .select()
      .from(memoryEntries)
      .where(and(eq(memoryEntries.scope, scope), eq(memoryEntries.scopeId, scopeId)))
      .all()
      .map((row) => ({
        id: row.id,
        scope: row.scope,
        scopeId: row.scopeId,
        key: row.key,
        value: parseJson(row.valueJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
  }

  static canonicalizePayload(payload: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  }
}
