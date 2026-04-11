import type { AgentProfile, Action, ControlSettings } from "./types"
import { generateId } from "./utils"
import { getDb } from "./db"

class AgentController {
  register(agent: Omit<AgentProfile, "id">): AgentProfile {
    const db = getDb()
    const id = generateId("agent")

    db.run(
      `INSERT INTO agents (id, name, role, capabilities, status, model) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, agent.name, agent.role, JSON.stringify(agent.capabilities), agent.status, agent.model]
    )

    return { ...agent, id }
  }

  get(id: string): AgentProfile | undefined {
    const db = getDb()
    const row = db.query("SELECT * FROM agents WHERE id = ?").get(id) as any
    if (!row) return undefined
    return this.mapRowToAgent(row)
  }

  getByName(name: string): AgentProfile | undefined {
    const db = getDb()
    const row = db.query("SELECT * FROM agents WHERE name = ?").get(name) as any
    if (!row) return undefined
    return this.mapRowToAgent(row)
  }

  list(): AgentProfile[] {
    const db = getDb()
    const rows = db.query("SELECT * FROM agents").all() as any[]
    return rows.map(this.mapRowToAgent)
  }

  updateStatus(id: string, status: AgentProfile["status"]): AgentProfile | undefined {
    const db = getDb()
    const result = db.run("UPDATE agents SET status = ? WHERE id = ?", [status, id])
    if (result.changes === 0) return undefined
    return this.get(id)
  }

  selectAgent(action: Action, modelStrategy?: ControlSettings["modelStrategy"]): AgentProfile | undefined {
    const db = getDb()
    const allAgents = this.list()

    // Filter by capability and status
    const candidates = allAgents.filter(
      (a) => a.capabilities.includes(action) && a.status !== "error"
    )

    if (candidates.length === 0) return undefined

    // Apply model strategy
    let scored = candidates
    if (modelStrategy === "local-first") {
      scored = candidates.filter((a) => a.model.startsWith("local/"))
      if (scored.length === 0) scored = candidates
    } else if (modelStrategy === "cloud-first") {
      scored = candidates.filter((a) => a.model.startsWith("cloud/"))
      if (scored.length === 0) scored = candidates
    }
    // adaptive: no filtering, use default scoring

    // Sort by status preference (idle preferred, then active)
    scored.sort((a, b) => {
      if (a.status === "idle" && b.status !== "idle") return -1
      if (a.status !== "idle" && b.status === "idle") return 1
      return 0
    })

    return scored[0]
  }

  private mapRowToAgent(row: any): AgentProfile {
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

export const agentController = new AgentController()
