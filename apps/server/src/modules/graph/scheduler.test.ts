import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExecutionEdge, ExecutionGraph, ExecutionNode } from "@/types";

type GraphState = {
  graph: ExecutionGraph;
  nodes: ExecutionNode[];
  edges: ExecutionEdge[];
  attempts: Array<{
    nodeId: string;
    attemptNumber: number;
    status: string;
    errorText?: string;
    inputSnapshotId?: string;
    outputSnapshotId?: string;
    traceId?: string;
    latencyMs?: number;
    tokenUsage?: { input: number; output: number; total: number };
    costEstimateUsd?: number;
  }>;
};

function createGraphState(): GraphState {
  return {
    graph: {
      id: "graph_test",
      goalId: "goal_test",
      status: "pending",
      version: "1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    nodes: [],
    edges: [],
    attempts: [],
  };
}

function makeNode(graphId: string, id: string, status: ExecutionNode["status"] = "pending"): ExecutionNode {
  return {
    id,
    graphId,
    kind: "write_code",
    label: id,
    status,
    action: "write_code",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function getReadyNodes(state: GraphState) {
  return state.nodes.filter((node) => {
    if (node.status !== "pending" && node.status !== "ready") return false;

    const incomingDepends = state.edges.filter(
      (edge) => edge.toNodeId === node.id && edge.edgeType === "depends_on",
    );
    const incomingRecovery = state.edges.filter(
      (edge) =>
        edge.toNodeId === node.id &&
        (edge.edgeType === "on_failure" || edge.edgeType === "fallback_to"),
    );

    const dependsSatisfied = incomingDepends.every((edge) => {
      const source = state.nodes.find((candidate) => candidate.id === edge.fromNodeId);
      return source?.status === "success";
    });

    const recoverySatisfied = incomingRecovery.some((edge) => {
      const source = state.nodes.find((candidate) => candidate.id === edge.fromNodeId);
      return source?.status === "failed";
    });

    if (incomingRecovery.length > 0) {
      return recoverySatisfied;
    }

    return incomingDepends.length === 0 || dependsSatisfied;
  });
}

async function loadScheduler(state: GraphState) {
  vi.resetModules();
  vi.doMock("@/modules/graph/service", () => ({
    GraphService: {
      markGraphStatus: vi.fn((graphId: string, status: ExecutionGraph["status"]) => {
        if (graphId === state.graph.id) {
          state.graph = { ...state.graph, status };
        }
      }),
      getReadyNodes: vi.fn(() => getReadyNodes(state)),
      getGraphView: vi.fn(() => ({
        ...state.graph,
        nodes: state.nodes,
        edges: state.edges,
      })),
      markNodeStatus: vi.fn((nodeId: string, status: ExecutionNode["status"], output?: Record<string, unknown>) => {
        state.nodes = state.nodes.map((node) =>
          node.id === nodeId ? { ...node, status, output: output || node.output } : node,
        );
      }),
      createAttempt: vi.fn((data: { nodeId: string }) => {
        const attempt = {
          nodeId: data.nodeId,
          attemptNumber: state.attempts.filter((item) => item.nodeId === data.nodeId).length + 1,
          status: "running",
        };
        state.attempts.push(attempt);
        return { id: `attempt_${attempt.attemptNumber}`, ...attempt };
      }),
      finishAttempt: vi.fn((
        nodeId: string,
        attemptNumber: number,
        data: {
          success: boolean;
          errorText?: string;
          outputSnapshotId?: string;
          latencyMs?: number;
          tokenUsage?: { input: number; output: number; total: number };
          costEstimateUsd?: number;
        },
      ) => {
        state.attempts = state.attempts.map((attempt) =>
          attempt.nodeId === nodeId && attempt.attemptNumber === attemptNumber
            ? {
                ...attempt,
                status: data.success ? "success" : "failed",
                errorText: data.errorText,
                outputSnapshotId: data.outputSnapshotId,
                latencyMs: data.latencyMs,
                tokenUsage: data.tokenUsage,
                costEstimateUsd: data.costEstimateUsd,
              }
            : attempt,
        );
      }),
      updateAttemptContext: vi.fn((attemptId: string, data: { inputSnapshotId?: string; outputSnapshotId?: string; traceId?: string }) => {
        state.attempts = state.attempts.map((attempt) =>
          `attempt_${attempt.attemptNumber}` === attemptId
            ? {
                ...attempt,
                ...data,
              }
            : attempt,
        );
      }),
    },
  }));

  return import("./scheduler");
}

describe("GraphScheduler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("runs dependent nodes in dependency order and marks graph success", async () => {
    const state = createGraphState();
    state.nodes = [makeNode(state.graph.id, "node_a"), makeNode(state.graph.id, "node_b")];
    state.edges = [
      {
        id: "edge_ab",
        graphId: state.graph.id,
        fromNodeId: "node_a",
        toNodeId: "node_b",
        edgeType: "depends_on",
      },
    ];

    const { GraphScheduler } = await loadScheduler(state);
    const visited: string[] = [];

    await GraphScheduler.runGraph(state.graph.id, async (node) => {
      visited.push(node.id);
      return { success: true, message: `${node.id} ok` };
    });

    expect(visited).toEqual(["node_a", "node_b"]);
    expect(state.graph.status).toBe("success");
    expect(state.nodes.map((node) => node.status)).toEqual(["success", "success"]);
    expect(state.attempts.map((attempt) => attempt.status)).toEqual(["success", "success"]);
  });

  it("treats a failed node as recovered when a fallback path succeeds", async () => {
    const state = createGraphState();
    state.nodes = [makeNode(state.graph.id, "node_primary"), makeNode(state.graph.id, "node_fallback")];
    state.edges = [
      {
        id: "edge_fallback",
        graphId: state.graph.id,
        fromNodeId: "node_primary",
        toNodeId: "node_fallback",
        edgeType: "fallback_to",
      },
    ];

    const { GraphScheduler } = await loadScheduler(state);
    const visited: string[] = [];

    await GraphScheduler.runGraph(state.graph.id, async (node) => {
      visited.push(node.id);
      if (node.id === "node_primary") {
        return { success: false, message: "primary failed" };
      }
      return { success: true, message: "fallback recovered" };
    });

    expect(visited).toEqual(["node_primary", "node_fallback"]);
    expect(state.graph.status).toBe("success");
    expect(state.nodes.find((node) => node.id === "node_primary")?.status).toBe("failed");
    expect(state.nodes.find((node) => node.id === "node_fallback")?.status).toBe("success");
  });

  it("records context snapshots and metrics when hooks are provided", async () => {
    const state = createGraphState();
    state.nodes = [makeNode(state.graph.id, "node_ctx")];

    const { GraphScheduler } = await loadScheduler(state);

    await GraphScheduler.runGraph(
      state.graph.id,
      async () => ({ success: true, message: "done" }),
      {
        traceId: "trace_test",
        contextSnapshotId: "ctx_base",
        contextFactory: () => "ctx_input",
        outputContextFactory: () => "ctx_output",
        metricsFactory: () => ({
          tokenUsage: { input: 10, output: 5, total: 15 },
          costEstimateUsd: 0.0015,
        }),
      },
    );

    expect(state.attempts[0]?.traceId).toBe("trace_test");
    expect(state.attempts[0]?.inputSnapshotId).toBe("ctx_input");
    expect(state.attempts[0]?.outputSnapshotId).toBe("ctx_output");
    expect(state.attempts[0]?.tokenUsage).toEqual({ input: 10, output: 5, total: 15 });
    expect(state.attempts[0]?.costEstimateUsd).toBe(0.0015);
  });
});
