import type { ExecutionNode } from "@/types";
import { GraphService } from "@/modules/graph/service";

export class GraphScheduler {
  private static hasRecoveredFailure(graph: NonNullable<ReturnType<typeof GraphService.getGraphView>>, nodeId: string) {
    const recoveryEdges = graph.edges.filter(
      (edge) =>
        edge.fromNodeId === nodeId &&
        (edge.edgeType === "on_failure" || edge.edgeType === "fallback_to"),
    );

    if (recoveryEdges.length === 0) return false;

    return recoveryEdges.some((edge) => {
      const target = graph.nodes.find((node) => node.id === edge.toNodeId);
      return target?.status === "success";
    });
  }

  static async runGraph(
    graphId: string,
    runner: (node: ExecutionNode) => Promise<{ success: boolean; message: string }>,
    options?: {
      concurrency?: number;
      traceId?: string;
      contextSnapshotId?: string;
      contextFactory?: (node: ExecutionNode, attemptId: string, baseSnapshotId: string) => string | undefined;
      outputContextFactory?: (
        node: ExecutionNode,
        attemptId: string,
        baseSnapshotId: string,
        result: { success: boolean; message: string },
      ) => string | undefined;
      metricsFactory?: (
        node: ExecutionNode,
        result: { success: boolean; message: string },
      ) => {
        tokenUsage?: { input: number; output: number; total: number };
        costEstimateUsd?: number;
      };
    },
  ) {
    GraphService.markGraphStatus(graphId, "running");
    const concurrency = Math.max(1, options?.concurrency ?? 2);

    while (true) {
      const readyNodes = GraphService.getReadyNodes(graphId);
      if (readyNodes.length === 0) {
        const graph = GraphService.getGraphView(graphId);
        const hasFailed = graph?.nodes.some(
          (node) =>
            node.status === "failed" &&
            !GraphScheduler.hasRecoveredFailure(graph, node.id),
        );
        const hasPending = graph?.nodes.some(
          (node) => node.status === "pending" || node.status === "ready" || node.status === "running",
        );

        if (hasFailed) GraphService.markGraphStatus(graphId, "failed");
        else if (!hasPending) GraphService.markGraphStatus(graphId, "success");

        return;
      }

      const batch = readyNodes.slice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(async (node) => {
          GraphService.markNodeStatus(node.id, "running");
          const baseSnapshotId = options?.contextSnapshotId;
          const attempt = GraphService.createAttempt({
            nodeId: node.id,
            traceId: options?.traceId,
          });
          const inputSnapshotId = baseSnapshotId
            ? options?.contextFactory?.(node, attempt.id, baseSnapshotId) || baseSnapshotId
            : undefined;
          if (inputSnapshotId || options?.traceId) {
            GraphService.updateAttemptContext(attempt.id, {
              inputSnapshotId,
              traceId: options?.traceId,
            });
          }
          const result = await runner(node);
          const outputSnapshotId = inputSnapshotId
            ? options?.outputContextFactory?.(node, attempt.id, inputSnapshotId, result)
            : undefined;
          if (outputSnapshotId) {
            GraphService.updateAttemptContext(attempt.id, {
              inputSnapshotId,
              outputSnapshotId,
              traceId: options?.traceId,
            });
          }
          const metrics = options?.metricsFactory?.(node, result);
          GraphService.finishAttempt(node.id, attempt.attemptNumber, {
            success: result.success,
            outputSnapshotId,
            latencyMs: Math.max(0, Date.now() - new Date(attempt.startedAt).getTime()),
            tokenUsage: metrics?.tokenUsage,
            costEstimateUsd: metrics?.costEstimateUsd,
            errorText: result.success ? undefined : result.message,
          });
          GraphService.markNodeStatus(node.id, result.success ? "success" : "failed", {
            message: result.message,
          });

          return { node, result };
        }),
      );

      let terminalFailure = false;

      for (const { node, result } of batchResults) {
        if (result.success) continue;

        const graph = GraphService.getGraphView(graphId);
        const failureEdges = graph?.edges.filter(
          (edge) =>
            edge.fromNodeId === node.id &&
            (edge.edgeType === "on_failure" || edge.edgeType === "fallback_to"),
        );

        if (failureEdges && failureEdges.length > 0) {
          for (const edge of failureEdges) {
            GraphService.markNodeStatus(edge.toNodeId, "ready");
          }
          continue;
        }

        terminalFailure = true;
      }

      if (terminalFailure) {
        GraphService.markGraphStatus(graphId, "failed");
        return;
      }
    }
  }
}
