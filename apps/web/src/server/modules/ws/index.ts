import { Elysia } from "elysia";

const clients = new Set<any>();

export function broadcastEvent(event: unknown) {
  const message = JSON.stringify({ type: "event", data: event });
  for (const ws of clients) {
    try {
      ws.send(message);
    } catch {}
  }
}

export function createWsController() {
  return new Elysia({ prefix: "/" }).ws("/ws", {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ type: "connected" }));
    },
    close(ws) {
      clients.delete(ws);
    },
    message(ws, message) {
      ws.send(JSON.stringify({ type: "pong", data: message }));
    },
  });
}
