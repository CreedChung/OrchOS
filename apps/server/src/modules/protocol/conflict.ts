import { db } from "@/db";
import { conflicts } from "@/db/schema";
import type { ConflictRecord, SideEffectDeclaration } from "@/types";
import { generateId, timestamp } from "@/utils";

export abstract class ConflictService {
  static detectFileOverlap(sideEffects: SideEffectDeclaration[]) {
    const writes = sideEffects.filter((effect) => effect.type === "file_write" && effect.target);
    const seen = new Set<string>();

    for (const effect of writes) {
      if (seen.has(effect.target)) return effect.target;
      seen.add(effect.target);
    }

    return undefined;
  }

  static create(data: Omit<ConflictRecord, "id" | "createdAt">): ConflictRecord {
    const id = generateId("conflict");
    const createdAt = timestamp();

    db.insert(conflicts)
      .values({
        id,
        graphId: data.graphId || null,
        nodeId: data.nodeId || null,
        conflictType: data.conflictType,
        summary: data.summary,
        participantsJson: JSON.stringify(data.participants),
        resolution: data.resolution || null,
        createdAt,
      })
      .run();

    return { ...data, id, createdAt };
  }

  static list(): ConflictRecord[] {
    return db.select().from(conflicts).all().map((row) => ({
      id: row.id,
      graphId: row.graphId || undefined,
      nodeId: row.nodeId || undefined,
      conflictType: row.conflictType as ConflictRecord["conflictType"],
      summary: row.summary,
      participants: JSON.parse(row.participantsJson) as string[],
      resolution: row.resolution || undefined,
      createdAt: row.createdAt,
    }));
  }
}
