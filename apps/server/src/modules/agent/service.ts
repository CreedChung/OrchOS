import { db } from "@/db";
import { agents, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/utils";
import type { AgentProfile, Action, ControlSettings } from "@/types";

export abstract class AgentService {
  static register(agent: Omit<AgentProfile, "id">): AgentProfile {
    const id = generateId("agent");

    db.insert(agents)
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

  static get(id: string): AgentProfile | undefined {
    const row = db.select().from(agents).where(eq(agents.id, id)).get();
    if (!row) return undefined;
    return AgentService.mapRow(row);
  }

  static getByName(name: string): AgentProfile | undefined {
    const row = db.select().from(agents).where(eq(agents.name, name)).get();
    if (!row) return undefined;
    return AgentService.mapRow(row);
  }

  static list(): AgentProfile[] {
    return db.select().from(agents).all().map(AgentService.mapRow);
  }

  static update(
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
  ): AgentProfile | undefined {
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

    if (Object.keys(updates).length === 0) return AgentService.get(id);

    db.update(agents).set(updates).where(eq(agents.id, id)).run();
    return AgentService.get(id);
  }

  static updateStatus(id: string, status: AgentProfile["status"]): AgentProfile | undefined {
    db.update(agents).set({ status }).where(eq(agents.id, id)).run();
    return AgentService.get(id);
  }

  static updateEnabled(id: string, enabled: boolean): AgentProfile | undefined {
    db.update(agents)
      .set({ enabled: String(enabled) })
      .where(eq(agents.id, id))
      .run();
    return AgentService.get(id);
  }

  static updateAvatar(id: string, avatarUrl: string): AgentProfile | undefined {
    db.update(agents).set({ avatarUrl }).where(eq(agents.id, id)).run();
    return AgentService.get(id);
  }

  static remove(id: string): boolean {
    db.update(conversations).set({ agentId: null }).where(eq(conversations.agentId, id)).run();
    const result = db.delete(agents).where(eq(agents.id, id)).run();
    return result.changes > 0;
  }

  static selectAgent(
    action: Action,
    modelStrategy?: ControlSettings["modelStrategy"],
  ): AgentProfile | undefined {
    const allAgents = AgentService.list();

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
