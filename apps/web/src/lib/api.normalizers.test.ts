import { describe, expect, it } from "vitest";

import {
  normalizeConversationMessage,
  normalizeInboxThread,
  normalizeTrace,
} from "./api.normalizers";

describe("api normalizers", () => {
  it("normalizes conversation messages with trace and metadata", () => {
    const normalized = normalizeConversationMessage({
      id: "msg_1",
      conversationId: "conv_1",
      role: "user",
      content: "hello",
      error: "oops",
      responseTime: 42,
      executionMode: "sandbox",
      sandboxStatus: "created",
      sandboxVmId: "vm_1",
      projectId: "project_1",
      projectName: "Alpha",
      clarificationQuestions: [123, "why"],
      createdAt: "2026-01-01T00:00:00.000Z",
      trace: [
        { kind: "message", text: "plain" },
        { kind: "thought", text: "reasoning" },
        {
          kind: "tool",
          toolName: "search",
          toolCallId: "call_1",
          state: "completed",
          input: { query: "x" },
          output: { ok: true },
        },
        { kind: "ignored", text: "nope" },
      ],
    });

    expect(normalized).toEqual({
      id: "msg_1",
      conversationId: "conv_1",
      role: "user",
      content: "hello",
      error: "oops",
      responseTime: 42,
      executionMode: "sandbox",
      sandboxStatus: "created",
      sandboxVmId: "vm_1",
      projectId: "project_1",
      projectName: "Alpha",
      clarificationQuestions: ["123", "why"],
      createdAt: "2026-01-01T00:00:00.000Z",
      trace: [
        { kind: "message", text: "plain" },
        { kind: "thought", text: "reasoning" },
        {
          kind: "tool",
          toolName: "search",
          toolCallId: "call_1",
          state: "completed",
          input: { query: "x" },
          output: { ok: true },
          errorText: undefined,
        },
      ],
    });
  });

  it("normalizes inbox thread fallbacks", () => {
    const normalized = normalizeInboxThread({
      id: "thread_1",
      title: null,
      status: "bad-status",
      priority: "bad-priority",
      kind: "bad-kind",
      createdByType: "bad-creator",
      updatedAt: "2026-01-02T00:00:00.000Z",
      archived: true,
    });

    expect(normalized).toEqual({
      id: "thread_1",
      kind: "agent_request",
      status: "open",
      priority: "warning",
      title: "Untitled",
      summary: undefined,
      projectId: undefined,
      conversationId: undefined,
      commandId: undefined,
      primaryGoalId: undefined,
      createdByType: "system",
      createdById: undefined,
      createdByName: "System",
      lastMessageAt: "2026-01-02T00:00:00.000Z",
      createdAt: new Date(0).toISOString(),
      updatedAt: "2026-01-02T00:00:00.000Z",
      archived: true,
    });
  });

  it("returns undefined for non-array trace", () => {
    expect(normalizeTrace(null)).toBeUndefined();
  });
});
