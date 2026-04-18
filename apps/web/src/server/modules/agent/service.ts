import type { AppDb } from "../../db/types";
import { agents } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import type { AgentProfile, Action, ControlSettings } from "../../types";

export abstract class AgentService {
  static async register(db: AppDb, agent: Omit<AgentProfile, "id">): Promise<AgentProfile> {
    const id = generateId("agent");

    await db
      .insert(agents)
      .values({
        id,
        name: agent.name,
        role: agent.role,
        capabilities: JSON.stringify(agent.capabilities),
        status: agent.status,
        model: agent.model,
        enabled: agent.enabled !== undefined ? String(agent.enabled) : "true",
        cliCommand: agent.cliCommand || null,
        runtimeId: agent.runtimeId || null,
      })
      .run();

    return { ...agent, id };
  }

  static async get(db: AppDb, id: string): Promise<AgentProfile | undefined> {
    const row = await db.select().from(agents).where(eq(agents.id, id)).get();
    if (!row) return undefined;
    return AgentService.mapRow(row);
  }

  static async getByName(db: AppDb, name: string): Promise<AgentProfile | undefined> {
    const row = await db.select().from(agents).where(eq(agents.name, name)).get();
    if (!row) return undefined;
    return AgentService.mapRow(row);
  }

  static async list(db: AppDb): Promise<AgentProfile[]> {
    const rows = await db.select().from(agents).all();
    return rows.map(AgentService.mapRow);
  }

  static async update(
    db: AppDb,
    id: string,
    data: Partial<
      Pick<
        AgentProfile,
        | "name"
        | "role"
        | "capabilities"
        | "status"
        | "model"
        | "enabled"
        | "cliCommand"
        | "runtimeId"
        | "avatarUrl"
      >
    >,
  ): Promise<AgentProfile | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.role !== undefined) updates.role = data.role;
    if (data.capabilities !== undefined) updates.capabilities = JSON.stringify(data.capabilities);
    if (data.status !== undefined) updates.status = data.status;
    if (data.model !== undefined) updates.model = data.model;
    if (data.enabled !== undefined) updates.enabled = String(data.enabled);
    if (data.cliCommand !== undefined) updates.cliCommand = data.cliCommand || null;
    if (data.runtimeId !== undefined) updates.runtimeId = data.runtimeId || null;
    if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl;

    if (Object.keys(updates).length === 0) return AgentService.get(db, id);

    const result = await db.update(agents).set(updates).where(eq(agents.id, id)).run();
    if (getRowsAffected(result) === 0) return undefined;
    return AgentService.get(db, id);
  }

  static async updateStatus(
    db: AppDb,
    id: string,
    status: AgentProfile["status"],
  ): Promise<AgentProfile | undefined> {
    const result = await db.update(agents).set({ status }).where(eq(agents.id, id)).run();
    if (getRowsAffected(result) === 0) return undefined;
    return AgentService.get(db, id);
  }

  static async updateEnabled(
    db: AppDb,
    id: string,
    enabled: boolean,
  ): Promise<AgentProfile | undefined> {
    const result = await db
      .update(agents)
      .set({ enabled: String(enabled) })
      .where(eq(agents.id, id))
      .run();
    if (getRowsAffected(result) === 0) return undefined;
    return AgentService.get(db, id);
  }

  static async updateAvatar(
    db: AppDb,
    id: string,
    avatarUrl: string,
  ): Promise<AgentProfile | undefined> {
    const result = await db.update(agents).set({ avatarUrl }).where(eq(agents.id, id)).run();
    if (getRowsAffected(result) === 0) return undefined;
    return AgentService.get(db, id);
  }

  static async selectAgent(
    db: AppDb,
    action: Action,
    modelStrategy?: ControlSettings["modelStrategy"],
  ): Promise<AgentProfile | undefined> {
    const allAgents = await AgentService.list(db);

    const candidates = allAgents.filter(
      (a) => a.enabled && a.capabilities.includes(action) && a.status !== "error",
    );

    if (candidates.length === 0) return undefined;

    let scored = candidates;
    if (modelStrategy === "local-first") {
      scored = candidates.filter((a) => a.model.startsWith("local/"));
      if (scored.length === 0) scored = candidates;
    } else if (modelStrategy === "cloud-first") {
      scored = candidates.filter((a) => a.model.startsWith("cloud/"));
      if (scored.length === 0) scored = candidates;
    }

    scored.sort((a, b) => {
      if (a.status === "idle" && b.status !== "idle") return -1;
      if (a.status !== "idle" && b.status === "idle") return 1;
      return 0;
    });

    return scored[0];
  }

  static mapRow(row: typeof agents.$inferSelect): AgentProfile {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      capabilities: JSON.parse(row.capabilities),
      status: row.status as AgentProfile["status"],
      model: row.model,
      enabled: row.enabled === "true",
      cliCommand: row.cliCommand || undefined,
      currentModel: row.currentModel || undefined,
      runtimeId: row.runtimeId || undefined,
      avatarUrl: row.avatarUrl || undefined,
    };
  }
}
