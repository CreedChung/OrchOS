import { Elysia, t } from "elysia";

import { authPlugin, requireAuth } from "@/modules/auth";
import { GraphModel } from "@/modules/graph/model";
import { GraphService } from "@/modules/graph/service";
import { GoalService } from "@/modules/goal/service";
import { GraphScheduler } from "@/modules/graph/scheduler";
import { PolicyService } from "@/modules/policy/service";
import { engine as executionService } from "@/modules/execution";
import { StateService } from "@/modules/state/service";
import { ProjectService } from "@/modules/project/service";
import { ActivityService } from "@/modules/activity/service";
import { InboxService } from "@/modules/inbox/service";

export const graphController = new Elysia({ prefix: "/api/graphs" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .post(
    "/compile",
    ({ body }) => {
      const goal = GoalService.get(body.goalId);
      if (!goal) return null;
      const project = goal.projectId ? ProjectService.get(goal.projectId) : undefined;
      const agentsFilePath = project?.path ? `${project.path.replace(/\/$/, "")}/AGENTS.md` : undefined;

      const states = StateService.getStatesByGoal(goal.id);
      const plannedActions = states
        .map((state) => state.label.split(" — ")[0]?.trim())
        .filter((action): action is "write_code" | "run_tests" | "fix_bug" | "commit" | "review" =>
          ["write_code", "run_tests", "fix_bug", "commit", "review"].includes(action),
        );

      const validatedPlan = PolicyService.validatePlan({
        subjectId: goal.id,
        actions: plannedActions,
        agentsFilePath,
        projectId: project?.id,
        projectPath: project?.path,
      });

      if (!validatedPlan.allowed) return null;

      return GraphService.createForGoal({
        goalId: goal.id,
        title: goal.title,
        actions: validatedPlan.actions,
        assignedAgentName: goal.watchers[0],
      });
    },
    {
      body: GraphModel.compileBody,
      response: t.Nullable(
        t.Object({
          id: t.String(),
          goalId: t.String(),
          status: t.String(),
          version: t.String(),
          createdAt: t.String(),
          updatedAt: t.String(),
        }),
      ),
    },
  )
  .get(
    "/:id",
    ({ params: { id } }) => {
      return GraphService.getGraphView(id) || null;
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Nullable(GraphModel.graphResponse),
    },
  )
  .get(
    "/goal/:goalId",
    ({ params: { goalId } }) => {
      const graph = GraphService.getByGoal(goalId);
      return graph ? GraphService.getGraphView(graph.id) : null;
    },
    {
      params: t.Object({ goalId: t.String() }),
      response: t.Nullable(GraphModel.graphResponse),
    },
  )
  .post(
    "/:id/run",
    async ({ params: { id } }) => {
      const graph = GraphService.getGraphView(id);
      if (!graph) return { success: false };
      const goal = GoalService.get(graph.goalId);
      const project = goal?.projectId ? ProjectService.get(goal.projectId) : undefined;
      const agentsFilePath = project?.path ? `${project.path.replace(/\/$/, "")}/AGENTS.md` : undefined;

      await GraphScheduler.runGraph(id, async (node) => {
        if (node.kind === "reflect") {
          const attempts = GraphService.listAttempts(id).filter((attempt) => attempt.nodeId !== node.id);
          const summary = attempts.some((attempt) => attempt.status === "failed")
            ? "Execution completed with failures requiring follow-up."
            : "Execution completed successfully with no failed attempts.";
          ActivityService.add(graph.goalId, node.assignedAgentName || "Orchestrator", "reflect", summary);
          return { success: true, message: summary };
        }

        if (node.kind === "handoff") {
          const thread = InboxService.createAgentRequestThread({
            title: `Handoff for ${node.label}`,
            body: `Graph node '${node.label}' requires handoff to another agent.`,
            summary: `Generated from graph ${id}`,
            projectId: project?.id,
            recipients: [node.assignedAgentName || "User"],
            cc: ["User"],
          });
          InboxService.addMessage({
            threadId: thread.id,
            messageType: "status_update",
            senderType: "system",
            senderName: "Graph Scheduler",
            body: `Handoff created for node ${node.id}.`,
            goalId: graph.goalId,
            metadata: { graphId: id, nodeId: node.id, type: "handoff" },
          });
          return { success: true, message: `Handoff thread ${thread.id} created` };
        }

        const policy = PolicyService.validateNodeExecution({
          nodeId: node.id,
          action: node.action,
          goalId: graph.goalId,
          projectId: project?.id,
          projectPath: project?.path,
          agentsFilePath,
        });
        if (!policy.allowed) {
          if (policy.decision === "fallback") {
            return { success: false, message: policy.reason || "Policy fallback requested" };
          }
          const state = StateService.getStatesByGoal(graph.goalId).find((item) => item.label === node.label);
          if (state) StateService.updateState(state.id, "failed");
          return { success: false, message: policy.reason || "Policy denied node execution" };
        }

        const state = StateService.getStatesByGoal(graph.goalId).find((item) => item.label === node.label);
        const toolPolicy = PolicyService.validateToolCall({
          subjectId: node.id,
          toolName: rewrittenToolNameForAction((policy.rewrite?.action as string | undefined) || node.action),
          projectPath: project?.path,
          agentsFilePath,
        });
        if (!toolPolicy.allowed) {
          if (state) StateService.updateState(state.id, "failed");
          return { success: false, message: toolPolicy.reason || "Tool policy denied execution" };
        }

        const rewrittenAction = (policy.rewrite?.action as
          | "write_code"
          | "run_tests"
          | "fix_bug"
          | "commit"
          | "review"
          | undefined) || node.action;

        if (rewrittenAction === "write_code") {
          const filePolicy = PolicyService.validateFileWrite({
            subjectId: node.id,
            path: project?.path || process.cwd(),
            projectPath: project?.path,
            agentsFilePath,
          });
          if (!filePolicy.allowed) {
            if (state) StateService.updateState(state.id, "failed");
            return { success: false, message: filePolicy.reason || "File policy denied execution" };
          }
        }

        return executionService.executeAction(graph.goalId, rewrittenAction!, state?.id);
      }, { concurrency: 2 });

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      response: GraphModel.runResponse,
    },
  )
  .get(
    "/:id/trace",
    ({ params: { id } }) => {
      return GraphService.listAttempts(id);
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Array(GraphModel.traceEventResponse),
    },
  )
  .get(
    "/:id/policy",
    ({ params: { id } }) => {
      const graph = GraphService.getGraphView(id);
      if (!graph) {
        return { decisions: [], violations: [] };
      }
      return PolicyService.listGraphPolicyOutcomes(graph.nodes.map((node) => node.id));
    },
    {
      params: t.Object({ id: t.String() }),
      response: GraphModel.policyTraceResponse,
    },
  );

function rewrittenToolNameForAction(action?: string) {
  if (action === "write_code") return "local-filesystem-write";
  if (action === "run_tests") return "run-tests";
  if (action === "fix_bug") return "local-filesystem-write";
  if (action === "commit") return "git-commit";
  if (action === "review") return "review-check";
  return "unknown-tool";
}
