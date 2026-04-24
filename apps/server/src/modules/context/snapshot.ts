import { GoalService } from "@/modules/goal/service";
import { StateService } from "@/modules/state/service";
import { ActivityService } from "@/modules/activity/service";
import { ProjectService } from "@/modules/project/service";
import { GraphService } from "@/modules/graph/service";

export abstract class ContextSnapshotBuilder {
  static buildGoalPayload(goalId: string): Record<string, unknown> {
    const goal = GoalService.get(goalId);
    if (!goal) return { goalId };

    const project = goal.projectId ? ProjectService.get(goal.projectId) : undefined;
    const graph = GraphService.getByGoal(goalId);

    return {
      goal,
      project,
      graph,
      states: StateService.getStatesByGoal(goalId),
      artifacts: StateService.getArtifactsByGoal(goalId),
      activities: ActivityService.list(goalId),
    };
  }

  static buildHandoffPayload(subject: string) {
    return {
      subject,
      generatedAt: new Date().toISOString(),
    };
  }
}
