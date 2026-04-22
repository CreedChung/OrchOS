import { db } from "@/db";
import { commands } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateId, timestamp } from "@/utils";
import { eventBus } from "@/modules/event/event-bus";
import { GoalService } from "@/modules/goal/service";
import { AgentService } from "@/modules/agent/service";
import { ActivityService } from "@/modules/activity/service";
import { StateService } from "@/modules/state/service";
import { PlanningService } from "@/modules/execution/planner";
import { executionService } from "@/modules/execution/service";
import { InboxService } from "@/modules/inbox/service";
import type { AcpTraceEvent } from "@/modules/runtime/acp";
import type { Command, CommandStatus } from "@/types";

export interface DispatchResult {
  needsClarification: boolean;
  questions: string[];
  command: Command;
  trace?: AcpTraceEvent[];
  goals: Array<{
    id: string;
    title: string;
    assignedAgentName?: string;
  }>;
}

export abstract class CommandService {
  static create(data: {
    instruction: string;
    agentNames?: string[];
    projectIds?: string[];
  }): Command {
    const now = timestamp();
    const id = generateId("cmd");

    db.insert(commands)
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

    const command = CommandService.get(id)!;
    eventBus.emit("command_sent", { commandId: id, instruction: data.instruction }, undefined);

    return command;
  }

  static async dispatchAsync(
    command: Command,
    runtimeId?: string,
  ): Promise<DispatchResult> {
    CommandService.update(command.id, { status: "executing" });

    const resolvedAgentNames =
      command.agentNames.length > 0
        ? command.agentNames
        : AgentService.list()
            .filter((a) => a.enabled && a.status !== "error")
            .map((a) => a.name);

    const projectId = command.projectIds.length > 0 ? command.projectIds[0] : undefined;

    let planningResult;

    if (runtimeId) {
      try {
        planningResult = await PlanningService.plan(
          command.instruction,
          runtimeId,
          resolvedAgentNames,
        );
      } catch {
        planningResult = PlanningService.fallbackPlan(command.instruction, resolvedAgentNames);
      }
    } else {
      planningResult = PlanningService.fallbackPlan(command.instruction, resolvedAgentNames);
    }

    if (planningResult.needsClarification) {
      CommandService.update(command.id, { status: "failed" });

      const inboxThread = InboxService.createAgentRequestThread({
        title: command.instruction,
        body: command.instruction,
        summary: "Waiting for clarification before goals can be created.",
        projectId,
        commandId: command.id,
        recipients: resolvedAgentNames,
        cc: ["User"],
      });

      InboxService.addMessage({
        threadId: inboxThread.id,
        messageType: "question",
        senderType: "system",
        senderName: "Planner",
        subject: "Clarification needed",
        body: planningResult.questions.map((question, index) => `${index + 1}. ${question}`).join("\n"),
        to: ["User"],
        cc: resolvedAgentNames,
        metadata: {
          commandId: command.id,
          needsClarification: true,
        },
      });

      return {
        needsClarification: true,
        questions: planningResult.questions,
        command: CommandService.get(command.id)!,
        trace: planningResult.trace,
        goals: [],
      };
    }

    const plannedGoals = planningResult.goals;

    const createdGoals: DispatchResult["goals"] = [];
    let primaryGoalId: string | null = null;

    const inboxThread = InboxService.createAgentRequestThread({
      title: command.instruction,
      body: command.instruction,
      summary: `Dispatching work to ${resolvedAgentNames.length} agent${resolvedAgentNames.length === 1 ? "" : "s"}.`,
      projectId,
      commandId: command.id,
      recipients: resolvedAgentNames,
      cc: ["User"],
    });

    for (const planned of plannedGoals) {
      const watchers = planned.assignedAgentName
        ? [planned.assignedAgentName]
        : resolvedAgentNames;

      const goal = GoalService.create({
        title: planned.title,
        description: planned.description,
        successCriteria: planned.successCriteria,
        constraints: ["Follow existing code conventions"],
        projectId,
        commandId: command.id,
        watchers,
      });

      if (!primaryGoalId) {
        primaryGoalId = goal.id;
      }

      for (const action of planned.actions) {
        StateService.createState(
          goal.id,
          `${action} — ${planned.title}`,
          "pending",
          action === "write_code"
            ? ["Execute"]
            : action === "run_tests"
              ? ["Run", "Fix"]
              : action === "fix_bug"
                ? ["Fix", "Ignore"]
                : action === "commit"
                  ? ["Commit"]
                  : ["Review"],
        );
      }

      createdGoals.push({
        id: goal.id,
        title: goal.title,
        assignedAgentName: planned.assignedAgentName,
      });

      for (const agentName of watchers) {
        ActivityService.add(goal.id, agentName, "command_dispatched", command.instruction);
      }
    }

    if (primaryGoalId) {
      CommandService.update(command.id, { goalId: primaryGoalId });
      InboxService.updateThread(inboxThread.id, {
        status: "in_progress",
        primaryGoalId,
        summary: `Planned ${createdGoals.length} goal${createdGoals.length === 1 ? "" : "s"} for ${resolvedAgentNames.length} agent${resolvedAgentNames.length === 1 ? "" : "s"}.`,
      });
    }

    InboxService.addMessage({
      threadId: inboxThread.id,
      messageType: "status_update",
      senderType: "system",
      senderName: "Planner",
      subject: "Execution plan created",
      body: createdGoals
        .map((goal, index) => `${index + 1}. ${goal.title}${goal.assignedAgentName ? ` -> ${goal.assignedAgentName}` : ""}`)
        .join("\n"),
      to: resolvedAgentNames,
      cc: ["User"],
      metadata: {
        commandId: command.id,
        goalCount: createdGoals.length,
      },
    });

    for (const goalEntry of createdGoals) {
      eventBus.emit("goal_created", { goalId: goalEntry.id, commandId: command.id }, goalEntry.id);
    }

    for (const goalEntry of createdGoals) {
      executionService.runGoalLoop(goalEntry.id).catch((err) => {
        console.error(`Auto-execute failed for goal ${goalEntry.id}:`, err);
      });
    }

    return {
      needsClarification: false,
      questions: [],
      command: CommandService.get(command.id)!,
      trace: planningResult.trace,
      goals: createdGoals,
    };
  }

  private static dispatch(command: Command): void {
    CommandService.update(command.id, { status: "executing" });

    const resolvedAgentNames =
      command.agentNames.length > 0
        ? command.agentNames
        : AgentService.list()
            .filter((a) => a.enabled && a.status !== "error")
            .map((a) => a.name);

    const projectId = command.projectIds.length > 0 ? command.projectIds[0] : undefined;

    const goal = GoalService.create({
      title: command.instruction,
      description: `Created from command: ${command.instruction}`,
      successCriteria: ["Code implements the instruction", "Tests pass", "Build succeeds"],
      constraints: ["Follow existing code conventions"],
      projectId,
      commandId: command.id,
      watchers: resolvedAgentNames,
    });

    CommandService.update(command.id, { goalId: goal.id });

    for (const agentName of resolvedAgentNames) {
      ActivityService.add(goal.id, agentName, "command_dispatched", command.instruction);
    }

    eventBus.emit("goal_created", { goalId: goal.id, commandId: command.id }, goal.id);
  }

  static get(id: string): Command | undefined {
    const row = db.select().from(commands).where(eq(commands.id, id)).get();
    if (!row) return undefined;
    return CommandService.mapRow(row);
  }

  static list(): Command[] {
    return db
      .select()
      .from(commands)
      .orderBy(desc(commands.createdAt))
      .all()
      .map(CommandService.mapRow);
  }

  static update(
    id: string,
    patch: { status?: CommandStatus; goalId?: string },
  ): Command | undefined {
    const command = CommandService.get(id);
    if (!command) return undefined;

    const updates: Partial<typeof commands.$inferInsert> = {};
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.goalId !== undefined) updates.goalId = patch.goalId;

    if (Object.keys(updates).length === 0) return command;

    db.update(commands).set(updates).where(eq(commands.id, id)).run();
    return CommandService.get(id)!;
  }

  static delete(id: string): boolean {
    const existing = CommandService.get(id);
    if (!existing) return false;
    db.delete(commands).where(eq(commands.id, id)).run();
    return true;
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
