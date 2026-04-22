import { InboxService } from "@/modules/inbox/service";
import { GoalService } from "@/modules/goal/service";
import type { Artifact, InboxMessageType, InboxPriority, InboxThreadStatus, Status } from "@/types";

export abstract class InboxProjectionService {
  static addGoalMessage(
    goalId: string,
    data: {
      messageType: InboxMessageType;
      senderType: "user" | "agent" | "system";
      senderName: string;
      subject?: string;
      body: string;
      metadata?: Record<string, unknown>;
    },
  ): void {
    const goal = GoalService.get(goalId);
    if (!goal?.commandId) return;

    const thread = InboxService.listThreads().find((item) => item.commandId === goal.commandId);
    if (!thread) return;

    InboxService.addMessage({
      threadId: thread.id,
      messageType: data.messageType,
      senderType: data.senderType,
      senderName: data.senderName,
      subject: data.subject,
      body: data.body,
      to: goal.watchers,
      cc: ["User"],
      goalId,
      metadata: data.metadata,
    });
  }

  static projectGoalCreated(goalId: string): void {
    const goal = GoalService.get(goalId);
    if (!goal) return;

    this.addGoalMessage(goalId, {
      messageType: "status_update",
      senderType: "system",
      senderName: "Planner",
      subject: "Goal created",
      body: `Created goal "${goal.title}"${goal.watchers.length > 0 ? ` and assigned it to ${goal.watchers.join(", ")}.` : "."}`,
      metadata: {
        goalStatus: goal.status,
      },
    });
  }

  static projectGoalCompleted(goalId: string): void {
    const goal = GoalService.get(goalId);
    if (!goal) return;

    this.addGoalMessage(goalId, {
      messageType: "completion",
      senderType: "system",
      senderName: "Orchestrator",
      subject: "Goal completed",
      body: `Goal "${goal.title}" is now completed.`,
    });
  }

  static projectStateCreated(goalId: string, label: string, status: Status): void {
    this.addGoalMessage(goalId, {
      messageType: "status_update",
      senderType: "system",
      senderName: "Planner",
      subject: "Execution step added",
      body: `Added state "${label}" with initial status ${status}.`,
      metadata: {
        stateLabel: label,
        status,
      },
    });
  }

  static projectStateUpdated(goalId: string, label: string, status: Status): void {
    this.addGoalMessage(goalId, {
      messageType: status === "failed" || status === "error" ? "blocker" : "status_update",
      senderType: "system",
      senderName: "Executor",
      subject: `State ${status}`,
      body: `State "${label}" is now ${status}.`,
      metadata: {
        stateLabel: label,
        status,
      },
    });
  }

  static projectProblemCreated(data: {
    goalId?: string;
    title: string;
    priority: InboxPriority;
    context?: string;
    stateId?: string;
    problemId: string;
  }): void {
    if (!data.goalId) return;

    this.addGoalMessage(data.goalId, {
      messageType: "blocker",
      senderType: "system",
      senderName: "Observability",
      subject: data.title,
      body: data.context || data.title,
      metadata: {
        priority: data.priority,
        stateId: data.stateId,
        problemId: data.problemId,
      },
    });
  }

  static projectProblemUpdated(data: {
    goalId?: string;
    title: string;
    status: string;
    context?: string;
    problemId: string;
  }): void {
    if (!data.goalId) return;

    this.addGoalMessage(data.goalId, {
      messageType: "status_update",
      senderType: "system",
      senderName: "Observability",
      subject: `Problem ${data.status}`,
      body: `${data.title}${data.context ? `\n\n${data.context}` : ""}`,
      metadata: {
        problemId: data.problemId,
        status: data.status,
      },
    });
  }

  static projectArtifactCreated(artifact: Artifact): void {
    this.addGoalMessage(artifact.goalId, {
      messageType: "artifact",
      senderType: "system",
      senderName: "Executor",
      subject: `Artifact created: ${artifact.name}`,
      body: artifact.detail || `${artifact.type} artifact created with status ${artifact.status}.`,
      metadata: {
        artifactId: artifact.id,
        artifactType: artifact.type,
        artifactStatus: artifact.status,
      },
    });
  }

  static projectArtifactUpdated(artifact: Artifact): void {
    this.addGoalMessage(artifact.goalId, {
      messageType: artifact.status === "failed" || artifact.status === "error" ? "blocker" : "artifact",
      senderType: "system",
      senderName: "Executor",
      subject: `Artifact updated: ${artifact.name}`,
      body: artifact.detail || `${artifact.type} artifact is now ${artifact.status}.`,
      metadata: {
        artifactId: artifact.id,
        artifactType: artifact.type,
        artifactStatus: artifact.status,
      },
    });
  }

  static updateThreadStatusForGoal(goalId: string, status: InboxThreadStatus): void {
    const goal = GoalService.get(goalId);
    if (!goal?.commandId) return;

    const thread = InboxService.listThreads().find((item) => item.commandId === goal.commandId);
    if (!thread) return;
    InboxService.updateThread(thread.id, { status });
  }
}
