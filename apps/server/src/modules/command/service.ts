import { db } from "../../db"
import { commands } from "../../db/schema"
import { eq, desc } from "drizzle-orm"
import { generateId, timestamp } from "../../utils"
import { eventBus } from "../event/event-bus"
import { GoalService } from "../goal/service"
import { AgentService } from "../agent/service"
import { StateService } from "../state/service"
import { ActivityService } from "../activity/service"
import type { Command, CommandStatus } from "../../types"

export abstract class CommandService {
  static create(data: { instruction: string; agentNames?: string[]; projectIds?: string[] }): Command {
    const now = timestamp()
    const id = generateId("cmd")

    db.insert(commands).values({
      id,
      instruction: data.instruction,
      agentNames: JSON.stringify(data.agentNames ?? []),
      projectIds: JSON.stringify(data.projectIds ?? []),
      goalId: null,
      status: "sent",
      createdAt: now,
    }).run()

    const command = CommandService.get(id)!
    eventBus.emit("command_sent", { commandId: id, instruction: data.instruction }, undefined)

    CommandService.dispatch(command)

    return command
  }

  private static dispatch(command: Command): void {
    CommandService.update(command.id, { status: "executing" })

    const resolvedAgentNames = command.agentNames.length > 0
      ? command.agentNames
      : AgentService.list().filter(a => a.enabled && a.status !== "error").map(a => a.name)

    const projectId = command.projectIds.length > 0 ? command.projectIds[0] : undefined

    const goal = GoalService.create({
      title: command.instruction,
      description: `Created from command: ${command.instruction}`,
      successCriteria: ["Code implements the instruction", "Tests pass", "Build succeeds"],
      constraints: ["Follow existing code conventions"],
      projectId,
      commandId: command.id,
      watchers: resolvedAgentNames,
    })

    CommandService.update(command.id, { goalId: goal.id })

    for (const agentName of resolvedAgentNames) {
      ActivityService.add(goal.id, agentName, "command_dispatched", command.instruction)
    }

    eventBus.emit("goal_created", { goalId: goal.id, commandId: command.id }, goal.id)
  }

  static get(id: string): Command | undefined {
    const row = db.select().from(commands).where(eq(commands.id, id)).get()
    if (!row) return undefined
    return CommandService.mapRow(row)
  }

  static list(): Command[] {
    return db.select().from(commands).orderBy(desc(commands.createdAt)).all().map(CommandService.mapRow)
  }

  static update(id: string, patch: { status?: CommandStatus; goalId?: string }): Command | undefined {
    const command = CommandService.get(id)
    if (!command) return undefined

    const updates: Partial<typeof commands.$inferInsert> = {}
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.goalId !== undefined) updates.goalId = patch.goalId

    if (Object.keys(updates).length === 0) return command

    db.update(commands).set(updates).where(eq(commands.id, id)).run()
    return CommandService.get(id)!
  }

  static delete(id: string): boolean {
    const result = db.delete(commands).where(eq(commands.id, id)).run()
    return result.changes > 0
  }

  static mapRow(row: typeof commands.$inferSelect): Command {
    return {
      id: row.id,
      instruction: row.instruction,
      agentNames: JSON.parse(row.agentNames || "[]"),
      projectIds: JSON.parse(row.projectIds || "[]"),
      goalId: row.goalId ?? null,
      status: row.status as CommandStatus,
      createdAt: row.createdAt,
    }
  }
}
