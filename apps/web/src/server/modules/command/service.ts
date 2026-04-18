import type { AppDb } from "../../db/types";
import { commands } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "../../utils";
import { getRowsAffected } from "../../db/utils";
import { EventBus } from "../event/event-bus";
import { GoalService } from "../goal/service";
import { AgentService } from "../agent/service";
import { ActivityService } from "../activity/service";
import type { Command, CommandStatus } from "../../types";

export abstract class CommandService {
  static async create(
    db: AppDb,
    eventBus: EventBus,
    data: {
      instruction: string;
      agentNames?: string[];
      projectIds?: string[];
    },
  ): Promise<Command> {
    const now = timestamp();
    const id = generateId("cmd");

    await db
      .insert(commands)
      .values({
        id,
        instruction: data.instruction,
        agentNames: JSON.stringify(data.agentNames ?? []),
        projectIds: JSON.stringify(data.projectIds ?? []),
        goalId: null,
        status: "sent",
        createdAt: now,
      })
      .run();

    const command = (await CommandService.get(db, id))!;
    await eventBus.emit(
      "command_sent",
      { commandId: id, instruction: data.instruction },
      undefined,
    );

    await CommandService.dispatch(db, eventBus, command);

    return command;
  }

  private static async dispatch(db: AppDb, eventBus: EventBus, command: Command): Promise<void> {
    await CommandService.update(db, command.id, { status: "executing" });

    const resolvedAgentNames =
      command.agentNames.length > 0
        ? command.agentNames
        : (await AgentService.list(db))
            .filter((a) => a.enabled && a.status !== "error")
            .map((a) => a.name);

    const projectId = command.projectIds.length > 0 ? command.projectIds[0] : undefined;

    const goal = await GoalService.create(db, eventBus, {
      title: command.instruction,
      description: `Created from command: ${command.instruction}`,
      successCriteria: ["Code implements the instruction", "Tests pass", "Build succeeds"],
      constraints: ["Follow existing code conventions"],
      projectId,
      commandId: command.id,
      watchers: resolvedAgentNames,
    });

    await CommandService.update(db, command.id, { goalId: goal.id });

    for (const agentName of resolvedAgentNames) {
      await ActivityService.add(db, goal.id, agentName, "command_dispatched", command.instruction);
    }

    await eventBus.emit("goal_created", { goalId: goal.id, commandId: command.id }, goal.id);
  }

  static async get(db: AppDb, id: string): Promise<Command | undefined> {
    const row = await db.select().from(commands).where(eq(commands.id, id)).get();
    if (!row) return undefined;
    return CommandService.mapRow(row);
  }

  static async list(db: AppDb): Promise<Command[]> {
    const rows = await db.select().from(commands).orderBy(desc(commands.createdAt)).all();
    return rows.map(CommandService.mapRow);
  }

  static async update(
    db: AppDb,
    id: string,
    patch: { status?: CommandStatus; goalId?: string },
  ): Promise<Command | undefined> {
    const command = await CommandService.get(db, id);
    if (!command) return undefined;

    const updates: Partial<typeof commands.$inferInsert> = {};
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.goalId !== undefined) updates.goalId = patch.goalId;

    if (Object.keys(updates).length === 0) return command;

    await db.update(commands).set(updates).where(eq(commands.id, id)).run();
    return (await CommandService.get(db, id))!;
  }

  static async delete(db: AppDb, id: string): Promise<boolean> {
    const result = await db.delete(commands).where(eq(commands.id, id)).run();
    return getRowsAffected(result) > 0;
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
    };
  }
}
