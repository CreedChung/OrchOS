import { createFileRoute } from "@tanstack/react-router";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";

import { resolveApiUrl } from "@/lib/api";

function readTextPart(message: unknown) {
  if (!message || typeof message !== "object") return "";

  const candidate = message as {
    text?: string;
    content?: string;
    parts?: Array<{ type?: string; text?: string }>;
  };

  if (typeof candidate.text === "string") return candidate.text;
  if (typeof candidate.content === "string") return candidate.content;

  if (Array.isArray(candidate.parts)) {
    return candidate.parts
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }

  return "";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          conversationId?: string;
          message?: unknown;
          messages?: UIMessage[];
        };

        if (!body.conversationId) {
          return new Response("Missing conversationId", { status: 400 });
        }

        const latestMessage = body.message ?? body.messages?.[body.messages.length - 1];
        const content = readTextPart(latestMessage).trim();
        if (!content) {
          return new Response("Missing message text", { status: 400 });
        }

        const stream = createUIMessageStream({
          originalMessages: Array.isArray(body.messages) ? body.messages : [],
          execute: async ({ writer }) => {
            const prepareContextToolCallId = `prepare-context-${crypto.randomUUID()}`;
            const runRuntimeToolCallId = `run-runtime-${crypto.randomUUID()}`;

            writer.write({
              type: "tool-input-available",
              toolCallId: prepareContextToolCallId,
              toolName: "prepare_context",
              input: {
                conversationId: body.conversationId,
                promptPreview: content.slice(0, 160),
              },
            });
            writer.write({
              type: "tool-output-available",
              toolCallId: prepareContextToolCallId,
              output: {
                status: "ready",
                phase: "conversation-context-prepared",
              },
            });

            writer.write({
              type: "tool-input-available",
              toolCallId: runRuntimeToolCallId,
              toolName: "run_runtime",
              input: {
                conversationId: body.conversationId,
                prompt: content,
              },
            });

            const headers = new Headers();
            headers.set("Content-Type", "application/json");

            const cookieHeader = request.headers.get("cookie");
            if (cookieHeader) {
              headers.set("cookie", cookieHeader);
            }

            const authorizationHeader = request.headers.get("authorization");
            if (authorizationHeader) {
              headers.set("authorization", authorizationHeader);
            }

            const upstream = await fetch(
              resolveApiUrl(`/api/conversations/${body.conversationId}/messages`),
              {
                method: "POST",
                headers,
                body: JSON.stringify({ content }),
              },
            );

            if (!upstream.ok) {
              const errorText = await upstream.text();
              writer.write({
                type: "tool-output-error",
                toolCallId: runRuntimeToolCallId,
                errorText: errorText || "Failed to send message",
              });
              throw new Error(errorText || "Failed to send message");
            }

            const message = (await upstream.json()) as {
              id?: string;
              content?: string;
              error?: string;
              responseTime?: number;
              createdAt?: string;
            };

            const textPartId = `${message.id || "assistant"}-text`;

            writer.write({
              type: message.error ? "tool-output-error" : "tool-output-available",
              toolCallId: runRuntimeToolCallId,
              ...(message.error
                ? {
                    errorText: message.error,
                  }
                : {
                    output: {
                      status: "completed",
                      responseTime: message.responseTime,
                      textLength: (message.content || "").length,
                    },
                  }),
            });

            writer.write({
              type: "start",
              messageId: message.id,
            });
            writer.write({
              type: "text-start",
              id: textPartId,
            });
            writer.write({
              type: "text-delta",
              id: textPartId,
              delta: message.content || message.error || "",
            });
            writer.write({
              type: "text-end",
              id: textPartId,
            });
            writer.write({
              type: "finish",
              messageMetadata: {
                responseTime: message.responseTime,
                error: message.error,
                createdAt: message.createdAt,
              },
            });
          },
          onError: (error) => {
            if (error instanceof Error) {
              return error.message;
            }

            return "Failed to send message";
          },
        });

        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
