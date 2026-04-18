import { Elysia } from "elysia";
import type { EventBus } from "../event/event-bus";

export function createWsController(eventBus: EventBus) {
  const subscriptions = new WeakMap<object, () => void>();

  return new Elysia({ prefix: "/" }).ws("/ws", {
    open(ws) {
      const unsubscribe = eventBus.onAny((event) => {
        ws.send(JSON.stringify({ type: "event", data: event }));
      });
      subscriptions.set(ws, unsubscribe);
      ws.send(JSON.stringify({ type: "connected" }));
    },
    close(ws) {
      subscriptions.get(ws)?.();
      subscriptions.delete(ws);
    },
    message(ws, message) {
      ws.send(JSON.stringify({ type: "pong", data: message }));
    },
  });
}
