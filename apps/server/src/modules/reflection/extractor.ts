export abstract class ReflectionExtractor {
  static extractDetails(data: {
    graphId?: string;
    nodeId?: string;
    attemptId?: string;
    message: string;
    status: string;
    metadata?: Record<string, unknown>;
  }) {
    return {
      graphId: data.graphId,
      nodeId: data.nodeId,
      attemptId: data.attemptId,
      status: data.status,
      message: data.message,
      metadata: data.metadata,
    };
  }
}
