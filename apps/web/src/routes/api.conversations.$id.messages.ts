import { createFileRoute } from "@tanstack/react-router";
import { getLocalDb } from "@/server/runtime/local-db";
import { ConversationService } from "@/server/modules/conversation/service";
import { CustomAgentService } from "@/server/modules/custom-agents/service";

export const Route = createFileRoute("/api/conversations/$id/messages")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const conv = await ConversationService.get(await getLocalDb(), params.id);
        return conv
          ? Response.json(await ConversationService.getMessages(await getLocalDb(), params.id))
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
      POST: async ({ params, request }) => {
        const body = (await request.json()) as { content: string; customAgentId?: string };
        const db = await getLocalDb();

        if (body.customAgentId) {
          const agentService = new CustomAgentService(db);
          const agents = await agentService.list();
          const agent = agents.find((a) => a.id === body.customAgentId);
          if (!agent) {
            return Response.json({ error: "Custom agent not found" }, { status: 404 });
          }

          await ConversationService.addMessage(db, params.id, "user", body.content);

          try {
            const res = await fetch(agent.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${agent.apiKey}`,
              },
              body: JSON.stringify({
                model: agent.model,
                messages: [{ role: "user", content: body.content }],
              }),
            });

            if (!res.ok) {
              const errText = await res.text().catch(() => "Unknown error");
              throw new Error(`Agent returned ${res.status}: ${errText}`);
            }

            const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const replyContent = data.choices?.[0]?.message?.content ?? "No response";

            const msg = await ConversationService.addMessage(db, params.id, "assistant", replyContent);
            return Response.json(msg);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to get response from custom agent";
            const msg = await ConversationService.addMessage(db, params.id, "assistant", errorMsg, errorMsg);
            return Response.json(msg);
          }
        }

        const conv = await ConversationService.get(db, params.id);
        return conv
          ? Response.json(await ConversationService.sendAndReply(db, params.id, body.content))
          : Response.json({ error: "Conversation not found" }, { status: 404 });
      },
    },
  },
});
