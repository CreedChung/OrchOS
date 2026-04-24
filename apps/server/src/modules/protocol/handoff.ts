import { db } from "@/db";
import { handoffs } from "@/db/schema";
import type { HandoffPacket } from "@/types";
import { generateId, timestamp } from "@/utils";

export abstract class HandoffService {
  static create(packet: Omit<HandoffPacket, "id" | "createdAt">): HandoffPacket {
    const createdAt = timestamp();
    const id = generateId("handoff");

    db.insert(handoffs)
      .values({
        id,
        graphId: packet.graphId || null,
        nodeId: packet.nodeId || null,
        fromAgent: packet.fromAgent,
        toAgent: packet.toAgent,
        packetJson: JSON.stringify({ ...packet, id, createdAt }),
        createdAt,
      })
      .run();

    return { ...packet, id, createdAt };
  }

  static list(): HandoffPacket[] {
    return db.select().from(handoffs).all().map((row) => JSON.parse(row.packetJson) as HandoffPacket);
  }
}
