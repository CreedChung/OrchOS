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
import { ContextService } from "@/modules/context/service";
import { ReflectionService } from "@/modules/reflection/service";
import { ConflictService } from "@/modules/protocol/conflict";
import { HandoffService } from "@/modules/protocol/handoff";

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
        traceId: `trace_${goal.id}`,
        contextSnapshotId: ContextService.createSnapshot({
          goalId: goal.id,
          kind: "goal_context",
          payload: ContextService.buildGoalContext(goal.id),
        }).id,
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
      const traceId = graph.traceId || `trace_${graph.id}`;
      const contextSnapshot = graph.contextSnapshotId
        ? ContextService.getSnapshot(graph.contextSnapshotId)
        : ContextService.createSnapshot({
            goalId: graph.goalId,
            graphId: graph.id,
            kind: "goal_context",
            payload: ContextService.buildGoalContext(graph.goalId),
          });

      await GraphScheduler.runGraph(id, async (node) => {
        if (node.kind === "reflect") {
          const attempts = GraphService.listAttempts(id).filter((attempt) => attempt.nodeId !== node.id);
          const summary = attempts.some((attempt) => attempt.status === "failed")
            ? "Execution completed with failures requiring follow-up."
            : "Execution completed successfully with no failed attempts.";
          ActivityService.add(graph.goalId, node.assignedAgentName || "Orchestrator", "reflect", summary);
          ReflectionService.create({ graphId: graph.id, nodeId: node.id, success: true, message: summary });
          return { success: true, message: summary };
        }

        if (node.kind === "handoff") {
          HandoffService.create({
            fromAgent: "Orchestrator",
            toAgent: node.assignedAgentName || "User",
            graphId: graph.id,
            nodeId: node.id,
            input: {
              taskId: node.id,
              goalId: graph.goalId,
              graphId: graph.id,
              nodeId: node.id,
              title: node.label,
              instruction: `Handoff for ${node.label}`,
              contextSnapshotId: contextSnapshot?.id,
            },
          });
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
            ReflectionService.create({
              graphId: graph.id,
              nodeId: node.id,
              success: false,
              message: filePolicy.reason || "File policy denied execution",
            });
            return { success: false, message: filePolicy.reason || "File policy denied execution" };
          }
        }

        const overlappingTarget = ConflictService.detectFileOverlap(
          rewrittenAction === "write_code"
            ? [{ type: "file_write", target: project?.path || process.cwd(), mode: "write" as const }]
            : [],
        );
        if (overlappingTarget) {
          ConflictService.create({
            graphId: graph.id,
            nodeId: node.id,
            conflictType: "file_overlap",
            summary: `Detected overlapping file mutation target '${overlappingTarget}'.`,
            participants: [node.id],
            resolution: "policy-review",
          });
        }

        return executionService.executeAction(graph.goalId, rewrittenAction!, state?.id);
      }, {
        concurrency: 2,
        traceId,
        contextSnapshotId: contextSnapshot?.id,
        contextFactory: (node, attemptId, baseSnapshotId) =>
          ContextService.deriveSnapshot({
            parentSnapshotId: baseSnapshotId,
            goalId: graph.goalId,
            graphId: graph.id,
            attemptId,
            kind: "node_input",
            patch: {
              node: {
                id: node.id,
                label: node.label,
                action: node.action,
              },
            },
          })?.id,
        outputContextFactory: (node, attemptId, baseSnapshotId, result) =>
          ContextService.deriveSnapshot({
            parentSnapshotId: baseSnapshotId,
            goalId: graph.goalId,
            graphId: graph.id,
            attemptId,
            kind: "node_output",
            patch: {
              nodeResult: {
                nodeId: node.id,
                success: result.success,
                message: result.message,
              },
              states: StateService.getStatesByGoal(graph.goalId),
              artifacts: StateService.getArtifactsByGoal(graph.goalId),
            },
          })?.id,
        metricsFactory: (node, result) => ({
          tokenUsage: {
            input: node.label.length,
            output: result.message.length,
            total: node.label.length + result.message.length,
          },
          costEstimateUsd: Number(((node.label.length + result.message.length) / 10000).toFixed(6)),
        }),
      });

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
    "/:id/replay",
    ({ params: { id } }) => {
      const graph = GraphService.getGraphView(id);
      if (!graph) return null;

      return {
        graph,
        attempts: GraphService.listAttempts(id),
        context: graph.contextSnapshotId ? ContextService.getSnapshot(graph.contextSnapshotId) : undefined,
        reflections: ReflectionService.list().filter((item) => item.graphId === id),
        handoffs: HandoffService.list().filter((item) => item.graphId === id),
        conflicts: ConflictService.list().filter((item) => item.graphId === id),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Nullable(GraphModel.replayResponse),
    },
  )
  .get(
    "/attempts/:attemptId/debug",
    ({ params: { attemptId } }) => {
      const attempt = GraphService.getAttempt(attemptId);
      if (!attempt) return null;
      return {
        attempt,
        inputSnapshot: attempt.inputSnapshotId ? ContextService.getSnapshot(attempt.inputSnapshotId) : undefined,
        outputSnapshot: attempt.outputSnapshotId ? ContextService.getSnapshot(attempt.outputSnapshotId) : undefined,
        reflection: ReflectionService.list().find((item) => item.attemptId === attemptId),
      };
    },
    {
      params: t.Object({ attemptId: t.String() }),
      response: t.Nullable(GraphModel.attemptDebugResponse),
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
