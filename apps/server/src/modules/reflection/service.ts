import { eq } from "drizzle-orm";

import { db } from "@/db";
import { failurePatterns, reflections, strategyUpdates } from "@/db/schema";
import type { FailurePattern, ReflectionRecord, StrategyUpdate } from "@/types";
import { generateId, timestamp } from "@/utils";
import { ReflectionClassifier } from "@/modules/reflection/classifier";
import { ReflectionExtractor } from "@/modules/reflection/extractor";

function parseJson<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined;
  return JSON.parse(value) as T;
}

export abstract class ReflectionService {
  static create(data: {
    graphId?: string;
    nodeId?: string;
    attemptId?: string;
    success: boolean;
    message: string;
    policyRewritten?: boolean;
    metadata?: Record<string, unknown>;
  }): ReflectionRecord {
    const id = generateId("refl");
    const createdAt = timestamp();
    const kind = ReflectionClassifier.classify(data);
    const details = ReflectionExtractor.extractDetails({
      graphId: data.graphId,
      nodeId: data.nodeId,
      attemptId: data.attemptId,
      message: data.message,
      status: data.success ? "success" : "failed",
      metadata: data.metadata,
    });

    db.insert(reflections)
      .values({
        id,
        graphId: data.graphId || null,
        nodeId: data.nodeId || null,
        attemptId: data.attemptId || null,
        kind,
        summary: data.message,
        detailsJson: JSON.stringify(details),
        createdAt,
      })
      .run();

    ReflectionService.recordFailurePattern({
      reflectionId: id,
      kind,
      nodeLabel: data.nodeId,
      message: data.message,
    });

    ReflectionService.createStrategyUpdate({
      sourceReflectionId: id,
      scope: data.graphId ? "graph" : "global",
      scopeId: data.graphId,
      summary: `Reflection captured for ${kind}`,
      payload: { kind, success: data.success },
    });

    return ReflectionService.list().find((item) => item.id === id)!;
  }

  static list(): ReflectionRecord[] {
    return db.select().from(reflections).all().map((row) => ({
      id: row.id,
      graphId: row.graphId || undefined,
      nodeId: row.nodeId || undefined,
      attemptId: row.attemptId || undefined,
      kind: row.kind,
      summary: row.summary,
      details: parseJson(row.detailsJson),
      createdAt: row.createdAt,
    }));
  }

  static listFailurePatterns(): FailurePattern[] {
    return db.select().from(failurePatterns).all().map((row) => ({
      id: row.id,
      signature: row.signature,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      occurrenceCount: Number(row.occurrenceCount),
      exampleReflectionId: row.exampleReflectionId || undefined,
    }));
  }

  static listStrategyUpdates(): StrategyUpdate[] {
    return db.select().from(strategyUpdates).all().map((row) => ({
      id: row.id,
      sourceReflectionId: row.sourceReflectionId || undefined,
      scope: row.scope,
      scopeId: row.scopeId || undefined,
      summary: row.summary,
      payload: parseJson(row.payloadJson),
      createdAt: row.createdAt,
    }));
  }

  static recordFailurePattern(data: {
    reflectionId: string;
    kind: string;
    nodeLabel?: string;
    message: string;
  }) {
    const signature = ReflectionClassifier.signature(data);
    const existing = db.select().from(failurePatterns).where(eq(failurePatterns.signature, signature)).get();
    const now = timestamp();

    if (existing) {
      db.update(failurePatterns)
        .set({
          lastSeenAt: now,
          occurrenceCount: String(Number(existing.occurrenceCount) + 1),
        })
        .where(eq(failurePatterns.id, existing.id))
        .run();
      return;
    }

    db.insert(failurePatterns)
      .values({
        id: generateId("fpat"),
        signature,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrenceCount: "1",
        exampleReflectionId: data.reflectionId,
      })
      .run();
  }

  static createStrategyUpdate(data: {
    sourceReflectionId?: string;
    scope: string;
    scopeId?: string;
    summary: string;
    payload?: Record<string, unknown>;
  }) {
    db.insert(strategyUpdates)
      .values({
        id: generateId("supdate"),
        sourceReflectionId: data.sourceReflectionId || null,
        scope: data.scope,
        scopeId: data.scopeId || null,
        summary: data.summary,
        payloadJson: data.payload ? JSON.stringify(data.payload) : null,
        createdAt: timestamp(),
      })
      .run();
  }
}
