import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  executionAttempts,
  executionEdges,
  executionGraphs,
  executionNodes,
} from "@/db/schema";
import type { Action, ExecutionAttempt, ExecutionEdge, ExecutionGraph, ExecutionNode } from "@/types";
import { generateId, timestamp } from "@/utils";
import { GraphCompiler } from "@/modules/graph/compiler";

function parseJson<T>(value: string | null | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export abstract class GraphService {
  static createForGoal(data: {
    goalId: string;
    title: string;
    actions: Action[];
    assignedAgentName?: string;
  }): ExecutionGraph {
    const existing = GraphService.getByGoal(data.goalId);
    if (existing) return existing;

    const id = generateId("graph");
    const now = timestamp();
    db.insert(executionGraphs)
      .values({ id, goalId: data.goalId, status: "pending", version: "1", createdAt: now, updatedAt: now })
      .run();

    const compiled = GraphCompiler.compileGoal({
      graphId: id,
      title: data.title,
      actions: data.actions,
      assignedAgentName: data.assignedAgentName,
    });

    for (const node of compiled.nodes) {
      db.insert(executionNodes)
        .values({
          id: node.id,
          graphId: id,
          kind: node.kind,
          label: node.label,
          status: node.status,
          action: node.action || null,
          assignedAgentName: node.assignedAgentName || null,
          assignedRuntimeId: node.assignedRuntimeId || null,
          inputJson: node.input ? JSON.stringify(node.input) : null,
          outputJson: node.output ? JSON.stringify(node.output) : null,
          policyJson: node.policy ? JSON.stringify(node.policy) : null,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })
        .run();
    }

    for (const edge of compiled.edges) {
      db.insert(executionEdges)
        .values({
          id: edge.id,
          graphId: id,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          edgeType: edge.edgeType,
          conditionJson: edge.condition ? JSON.stringify(edge.condition) : null,
        })
        .run();
    }

    return GraphService.get(id)!;
  }

  static get(id: string): ExecutionGraph | undefined {
    const row = db.select().from(executionGraphs).where(eq(executionGraphs.id, id)).get();
    if (!row) return undefined;
    return row;
  }

  static getByGoal(goalId: string): ExecutionGraph | undefined {
    const row = db.select().from(executionGraphs).where(eq(executionGraphs.goalId, goalId)).get();
    if (!row) return undefined;
    return row;
  }

  static listNodes(graphId: string): ExecutionNode[] {
    return db
      .select()
      .from(executionNodes)
      .where(eq(executionNodes.graphId, graphId))
      .all()
      .map((row) => ({
        id: row.id,
        graphId: row.graphId,
        kind: row.kind as ExecutionNode["kind"],
        label: row.label,
        status: row.status as ExecutionNode["status"],
        action: (row.action || undefined) as ExecutionNode["action"],
        assignedAgentName: row.assignedAgentName || undefined,
        assignedRuntimeId: row.assignedRuntimeId || undefined,
        input: parseJson(row.inputJson),
        output: parseJson(row.outputJson),
        policy: parseJson(row.policyJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
  }

  static listEdges(graphId: string): ExecutionEdge[] {
    return db
      .select()
      .from(executionEdges)
      .where(eq(executionEdges.graphId, graphId))
      .all()
      .map((row) => ({
        id: row.id,
        graphId: row.graphId,
        fromNodeId: row.fromNodeId,
        toNodeId: row.toNodeId,
        edgeType: row.edgeType as ExecutionEdge["edgeType"],
        condition: parseJson(row.conditionJson),
      }));
  }

  static getGraphView(graphId: string) {
    const graph = GraphService.get(graphId);
    if (!graph) return undefined;
    return {
      ...graph,
      nodes: GraphService.listNodes(graphId),
      edges: GraphService.listEdges(graphId),
    };
  }

  static listAttempts(graphId: string): ExecutionAttempt[] {
    const nodes = GraphService.listNodes(graphId);
    const nodeIds = new Set(nodes.map((node) => node.id));

    return db
      .select()
      .from(executionAttempts)
      .all()
      .filter((row) => nodeIds.has(row.nodeId))
      .map((row) => ({
        id: row.id,
        nodeId: row.nodeId,
        attemptNumber: Number(row.attemptNumber),
        strategy: row.strategy,
        status: row.status as ExecutionAttempt["status"],
        errorCode: row.errorCode || undefined,
        errorText: row.errorText || undefined,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt || undefined,
      }));
  }

  static markNodeStatus(
    nodeId: string,
    status: ExecutionNode["status"],
    output?: Record<string, unknown>,
  ): ExecutionNode | undefined {
    db.update(executionNodes)
      .set({
        status,
        outputJson: output ? JSON.stringify(output) : undefined,
        updatedAt: timestamp(),
      })
      .where(eq(executionNodes.id, nodeId))
      .run();

    const row = db.select().from(executionNodes).where(eq(executionNodes.id, nodeId)).get();
    if (!row) return undefined;
    return GraphService.listNodes(row.graphId).find((node) => node.id === nodeId);
  }

  static markGraphStatus(graphId: string, status: ExecutionGraph["status"]) {
    db.update(executionGraphs)
      .set({ status, updatedAt: timestamp() })
      .where(eq(executionGraphs.id, graphId))
      .run();
  }

  static getStateProjectionNode(graphId: string, label: string): ExecutionNode | undefined {
    return GraphService.listNodes(graphId).find((node) => node.label === label);
  }

  static getReadyNodes(graphId: string): ExecutionNode[] {
    const nodes = GraphService.listNodes(graphId);
    const edges = GraphService.listEdges(graphId);

    return nodes.filter((node) => {
      if (node.status !== "pending" && node.status !== "ready") return false;

      const incomingDepends = edges.filter(
        (edge) => edge.toNodeId === node.id && edge.edgeType === "depends_on",
      );
      const incomingFailure = edges.filter(
        (edge) =>
          edge.toNodeId === node.id &&
          (edge.edgeType === "on_failure" || edge.edgeType === "fallback_to"),
      );

      const dependsSatisfied = incomingDepends.every((edge) => {
        const source = nodes.find((candidate) => candidate.id === edge.fromNodeId);
        return source?.status === "success";
      });

      const failureSatisfied = incomingFailure.some((edge) => {
        const source = nodes.find((candidate) => candidate.id === edge.fromNodeId);
        return source?.status === "failed";
      });

      return dependsSatisfied || failureSatisfied;
    });
  }

  static createAttempt(nodeId: string, strategy: string = "default"): ExecutionAttempt {
    const existingCount = db
      .select()
      .from(executionAttempts)
      .where(eq(executionAttempts.nodeId, nodeId))
      .all().length;

    const attempt: ExecutionAttempt = {
      id: generateId("attempt"),
      nodeId,
      attemptNumber: existingCount + 1,
      strategy,
      status: "running",
      startedAt: timestamp(),
    };

    db.insert(executionAttempts)
      .values({
        id: attempt.id,
        nodeId: attempt.nodeId,
        attemptNumber: String(attempt.attemptNumber),
        strategy: attempt.strategy,
        status: attempt.status,
        errorCode: null,
        errorText: null,
        startedAt: attempt.startedAt,
        finishedAt: null,
      })
      .run();

    return attempt;
  }

  static finishAttempt(nodeId: string, attemptNumber: number, data: { success: boolean; errorText?: string }) {
    db.update(executionAttempts)
      .set({
        status: data.success ? "success" : "failed",
        errorText: data.errorText || null,
        finishedAt: timestamp(),
      })
      .where(
        and(eq(executionAttempts.nodeId, nodeId), eq(executionAttempts.attemptNumber, String(attemptNumber))),
      )
      .run();
  }
}
