import type { Action, ExecutionEdge, ExecutionNode } from "@/types";
import { generateId, timestamp } from "@/utils";

export class GraphCompiler {
  static compileGoal(data: {
    graphId: string;
    title: string;
    actions: Action[];
    assignedAgentName?: string;
  }): { nodes: Omit<ExecutionNode, "graphId">[]; edges: Omit<ExecutionEdge, "graphId">[] } {
    const now = timestamp();
    const nodes: Omit<ExecutionNode, "graphId">[] = [];
    const edges: Omit<ExecutionEdge, "graphId">[] = [];

    for (const action of data.actions) {
      const id = generateId("node");
      nodes.push({
        id,
        kind: action,
        label: `${action} — ${data.title}`,
        status: "pending",
        action,
        assignedAgentName: data.assignedAgentName,
        assignedRuntimeId: undefined,
        input: { title: data.title },
        output: undefined,
        policy: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    const terminalAction = data.actions[data.actions.length - 1];
    if (terminalAction && terminalAction !== "reflect") {
      nodes.push({
        id: generateId("node"),
        kind: "reflect",
        label: `reflect — ${data.title}`,
        status: "pending",
        action: undefined,
        assignedAgentName: data.assignedAgentName,
        assignedRuntimeId: undefined,
        input: { title: data.title },
        output: undefined,
        policy: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let i = 1; i < nodes.length; i++) {
      edges.push({
        id: generateId("edge"),
        fromNodeId: nodes[i - 1].id,
        toNodeId: nodes[i].id,
        edgeType: "depends_on",
        condition: undefined,
      });
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.kind === "run_tests") {
        const fixNode = nodes.find((candidate) => candidate.kind === "fix_bug");
        if (fixNode) {
          edges.push({
            id: generateId("edge"),
            fromNodeId: node.id,
            toNodeId: fixNode.id,
            edgeType: "on_failure",
            condition: { when: "failed" },
          });
          edges.push({
            id: generateId("edge"),
            fromNodeId: node.id,
            toNodeId: fixNode.id,
            edgeType: "fallback_to",
            condition: { strategy: "fix_bug" },
          });
        }
      }
    }

    return { nodes, edges };
  }
}
