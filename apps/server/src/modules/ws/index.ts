import { Elysia } from "elysia"
import { eventBus } from "../event/event-bus"

export const wsController = new Elysia({ prefix: "/" })
  .ws("/ws", {
    open(ws) {
      const unsubscribe = eventBus.onAny((event) => {
        ws.send(JSON.stringify({ type: "event", data: event }))
      })
      ws.data = { unsubscribe }
      ws.send(JSON.stringify({ type: "connected" }))
    },
    close(ws) {
      const data = ws.data as { unsubscribe: () => void } | undefined
      data?.unsubscribe()
    },
    message(ws, message) {
      ws.send(JSON.stringify({ type: "pong", data: message }))
    },
  })
