import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "../../db/types";
import { localHostPairings, localHosts } from "../../db/schema";
import { generateId, timestamp } from "../../utils";
import type { DetectedRuntime } from "../../runtime/execution-adapter";

const LOCAL_HOST_STALE_MS = 1000 * 60 * 2;
const PAIRING_TTL_MS = 1000 * 60 * 10;

function createToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export interface LocalHostProfile {
  id: string;
  userId: string;
  organizationId?: string;
  deviceId: string;
  name: string;
  platform?: string;
  appVersion?: string;
  status: "online" | "offline";
  runtimes: DetectedRuntime[];
  metadata: Record<string, string>;
  registeredAt: string;
  lastSeenAt: string;
}

export abstract class LocalHostService {
  static async listForUser(db: AppDb, userId: string, organizationId?: string | null) {
    const rows = await db.select().from(localHosts).where(eq(localHosts.userId, userId)).orderBy(desc(localHosts.lastSeenAt)).all();
    return rows
      .filter((row) => !organizationId || row.organizationId === organizationId)
      .map((row) => LocalHostService.mapRow(row));
  }

  static async heartbeat(
    db: AppDb,
    userId: string,
    organizationId: string | null,
    payload: {
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      runtimes: DetectedRuntime[];
      metadata?: Record<string, string>;
    },
  ) {
    const now = timestamp();
    const existing = await db
      .select()
      .from(localHosts)
      .where(and(eq(localHosts.userId, userId), eq(localHosts.deviceId, payload.deviceId)))
      .get();

    if (!existing) {
      const id = generateId("host");
      const hostToken = createToken("orchos_host");
      const hostTokenHash = await sha256(hostToken);
      await db.insert(localHosts).values({
        id,
        userId,
        organizationId: organizationId || null,
        deviceId: payload.deviceId,
        name: payload.name,
        hostToken: hostTokenHash,
        platform: payload.platform || null,
        appVersion: payload.appVersion || null,
        status: "online",
        runtimes: JSON.stringify(payload.runtimes),
        metadata: JSON.stringify(payload.metadata || {}),
        registeredAt: now,
        lastSeenAt: now,
      }).run();

      const created = await db.select().from(localHosts).where(eq(localHosts.id, id)).get();
      return LocalHostService.mapRow(created!);
    }

    await db.update(localHosts).set({
      organizationId: organizationId || null,
      name: payload.name,
      platform: payload.platform || null,
      appVersion: payload.appVersion || null,
      status: "online",
      runtimes: JSON.stringify(payload.runtimes),
      metadata: JSON.stringify(payload.metadata || {}),
      lastSeenAt: now,
    }).where(eq(localHosts.id, existing.id)).run();

    const updated = await db.select().from(localHosts).where(eq(localHosts.id, existing.id)).get();
    return LocalHostService.mapRow(updated!);
  }

  static async createPairingToken(db: AppDb, userId: string, organizationId: string | null) {
    const createdAt = timestamp();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();
    const token = createToken("orchos_pair");
    await db.insert(localHostPairings).values({
      id: generateId("pair"),
      token,
      userId,
      organizationId: organizationId || null,
      expiresAt,
      usedAt: null,
      createdAt,
    }).run();
    return { pairingToken: token, expiresAt };
  }

  static async pairHost(
    db: AppDb,
    payload: {
      pairingToken: string;
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      metadata?: Record<string, string>;
    },
  ) {
    const pairing = await db.select().from(localHostPairings).where(eq(localHostPairings.token, payload.pairingToken)).get();
    if (!pairing) {
      throw new Error("Invalid pairing token");
    }
    if (pairing.usedAt) {
      throw new Error("Pairing token has already been used");
    }
    if (Date.parse(pairing.expiresAt) <= Date.now()) {
      throw new Error("Pairing token has expired");
    }

    const existing = await db
      .select()
      .from(localHosts)
      .where(and(eq(localHosts.userId, pairing.userId), eq(localHosts.deviceId, payload.deviceId)))
      .get();

    const hostToken = createToken("orchos_host");
    const hostTokenHash = await sha256(hostToken);
    const now = timestamp();

    if (!existing) {
      const hostId = generateId("host");
      await db.insert(localHosts).values({
        id: hostId,
        userId: pairing.userId,
        organizationId: pairing.organizationId || null,
        deviceId: payload.deviceId,
        name: payload.name,
        hostToken: hostTokenHash,
        platform: payload.platform || null,
        appVersion: payload.appVersion || null,
        status: "online",
        runtimes: "[]",
        metadata: JSON.stringify(payload.metadata || {}),
        registeredAt: now,
        lastSeenAt: now,
      }).run();
    } else {
      await db.update(localHosts).set({
        organizationId: pairing.organizationId || null,
        name: payload.name,
        hostToken: hostTokenHash,
        platform: payload.platform || null,
        appVersion: payload.appVersion || null,
        status: "online",
        metadata: JSON.stringify(payload.metadata || {}),
        lastSeenAt: now,
      }).where(eq(localHosts.id, existing.id)).run();
    }

    await db.update(localHostPairings).set({ usedAt: now }).where(eq(localHostPairings.id, pairing.id)).run();

    const host = await db
      .select()
      .from(localHosts)
      .where(and(eq(localHosts.userId, pairing.userId), eq(localHosts.deviceId, payload.deviceId)))
      .get();

    return { hostToken, host: LocalHostService.mapRow(host!) };
  }

  static async getByHostToken(db: AppDb, hostToken: string) {
    const tokenHash = await sha256(hostToken);
    const row = await db.select().from(localHosts).where(eq(localHosts.hostToken, tokenHash)).get();
    if (!row) return undefined;
    return row;
  }

  static async heartbeatForHostToken(
    db: AppDb,
    hostToken: string,
    payload: {
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      runtimes: DetectedRuntime[];
      metadata?: Record<string, string>;
    },
  ) {
    const host = await LocalHostService.getByHostToken(db, hostToken);
    if (!host) {
      throw new Error("Invalid host token");
    }

    if (host.deviceId !== payload.deviceId) {
      throw new Error("Host token does not match device");
    }

    return LocalHostService.heartbeat(db, host.userId, host.organizationId, payload);
  }

  static mapRow(row: typeof localHosts.$inferSelect): LocalHostProfile {
    const lastSeenAt = row.lastSeenAt;
    const lastSeenTime = Date.parse(lastSeenAt);
    const isStale = Number.isNaN(lastSeenTime) || Date.now() - lastSeenTime > LOCAL_HOST_STALE_MS;

    return {
      id: row.id,
      userId: row.userId,
      organizationId: row.organizationId || undefined,
      deviceId: row.deviceId,
      name: row.name,
      platform: row.platform || undefined,
      appVersion: row.appVersion || undefined,
      status: isStale ? "offline" : "online",
      runtimes: JSON.parse(row.runtimes),
      metadata: JSON.parse(row.metadata),
      registeredAt: row.registeredAt,
      lastSeenAt,
    };
  }
}
