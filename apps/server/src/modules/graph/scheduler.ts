import type { ExecutionNode } from "@/types";
import { GraphService } from "@/modules/graph/service";

export class GraphScheduler {
  static async runGraph(
    graphId: string,
    runner: (node: ExecutionNode) => Promise<{ success: boolean; message: string }>,
    options?: { concurrency?: number },
  ) {
    GraphService.markGraphStatus(graphId, "running");
    const concurrency = Math.max(1, options?.concurrency ?? 2);

    while (true) {
      const readyNodes = GraphService.getReadyNodes(graphId);
      if (readyNodes.length === 0) {
        const graph = GraphService.getGraphView(graphId);
        const hasFailed = graph?.nodes.some((node) => node.status === "failed");
        const hasPending = graph?.nodes.some((node) => node.status === "pending");

        if (hasFailed) GraphService.markGraphStatus(graphId, "failed");
        else if (!hasPending) GraphService.markGraphStatus(graphId, "success");

        return;
      }

      const batch = readyNodes.slice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(async (node) => {
          GraphService.markNodeStatus(node.id, "running");
          const attempt = GraphService.createAttempt(node.id);
          const result = await runner(node);
          GraphService.finishAttempt(node.id, attempt.attemptNumber, {
            success: result.success,
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
