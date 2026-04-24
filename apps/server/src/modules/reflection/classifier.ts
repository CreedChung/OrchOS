export abstract class ReflectionClassifier {
  static classify(data: { success: boolean; message: string; policyRewritten?: boolean }) {
    if (!data.success) return "failed_node";
    if (data.policyRewritten) return "rewrite_heavy";
    return "degraded_execution";
  }

  static signature(data: { nodeLabel?: string; message: string; kind: string }) {
    return [data.kind, data.nodeLabel || "unknown-node", data.message.slice(0, 80)].join("::");
  }
}
