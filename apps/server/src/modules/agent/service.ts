import { db } from "../../db"
import { agents } from "../../db/schema"
import { eq } from "drizzle-orm"
import { generateId } from "../../utils"
import type { AgentProfile, Action, ControlSettings } from "../../types"
import type { AgentModel } from "./model"

export abstract class AgentService {
  static register(agent: Omit<AgentProfile, "id">): AgentProfile {
    const id = generateId("agent")

    db.insert(agents).values({
      id,
      name: agent.name,
      role: agent.role,
      capabilities: JSON.stringify(agent.capabilities),
      status: agent.status,
      model: agent.model,
    }).run()

    return { ...agent, id }
  }

  static get(id: string): AgentProfile | undefined {
    const row = db.select().from(agents).where(eq(agents.id, id)).get()
    if (!row) return undefined
    return AgentService.mapRow(row)
  }

  static getByName(name: string): AgentProfile | undefined {
    const row = db.select().from(agents).where(eq(agents.name, name)).get()
    if (!row) return undefined
    return AgentService.mapRow(row)
  }

  static list(): AgentProfile[] {
    return db.select().from(agents).all().map(AgentService.mapRow)
  }

  static updateStatus(id: string, status: AgentProfile["status"]): AgentProfile | undefined {
    const result = db.update(agents).set({ status }).where(eq(agents.id, id)).run()
    if (result.changes === 0) return undefined
    return AgentService.get(id)
  }

  static selectAgent(action: Action, modelStrategy?: ControlSettings["modelStrategy"]): AgentProfile | undefined {
    const allAgents = AgentService.list()

    const candidates = allAgents.filter(
      (a) => a.capabilities.includes(action) && a.status !== "error"
    )

    if (candidates.length === 0) return undefined

    let scored = candidates
    if (modelStrategy === "local-first") {
      scored = candidates.filter((a) => a.model.startsWith("local/"))
      if (scored.length === 0) scored = candidates
    } else if (modelStrategy === "cloud-first") {
      scored = candidates.filter((a) => a.model.startsWith("cloud/"))
      if (scored.length === 0) scored = candidates
    }

    scored.sort((a, b) => {
      if (a.status === "idle" && b.status !== "idle") return -1
      if (a.status !== "idle" && b.status === "idle") return 1
      return 0
    })

    return scored[0]
  }

  static mapRow(row: typeof agents.$inferSelect): AgentProfile {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      capabilities: JSON.parse(row.capabilities),
      status: row.status as AgentProfile["status"],
      model: row.model,
    }
  }
}
