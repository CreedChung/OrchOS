import { Elysia } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { eventBus } from "@/modules/event/event-bus";

const subscriptions = new WeakMap<object, () => void>();

export const wsController = new Elysia({ prefix: "/" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .ws("/ws", {
  open(ws) {
    const unsubscribe = eventBus.onAny((event) => {
      ws.send(JSON.stringify({ type: "event", data: event }));
    });
    subscriptions.set(ws, unsubscribe);
    ws.send(JSON.stringify({ type: "connected" }));
  },
  close(ws) {
    const unsubscribe = subscriptions.get(ws);
    unsubscribe?.();
    subscriptions.delete(ws);
  },
  message(ws, message) {
    ws.send(JSON.stringify({ type: "pong", data: message }));
  },
});
