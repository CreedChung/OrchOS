import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";
import { createEdenClient } from "./eden";

const WS_BASE_RECONNECT_DELAY_MS = 1000;
const WS_MAX_RECONNECT_DELAY_MS = 30000;

function shouldEnableWebSocket() {
  const envValue = import.meta.env.VITE_ENABLE_WEBSOCKET?.trim().toLowerCase();
  if (envValue === "true") return true;
  if (envValue === "false") return false;

  return false;
}

function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useGoals() {
  return useAsyncData(() => api.listGoals());
}

export function useGoal(id: string | null) {
  return useAsyncData(() => (id ? api.getGoal(id) : Promise.resolve(null)), [id]);
}

export function useStates(goalId: string | null) {
  return useAsyncData(() => (goalId ? api.getStates(goalId) : Promise.resolve([])), [goalId]);
}

export function useArtifacts(goalId: string | null) {
  return useAsyncData(() => (goalId ? api.getArtifacts(goalId) : Promise.resolve([])), [goalId]);
}

export function useActivities(goalId: string | null) {
  return useAsyncData(() => (goalId ? api.getActivities(goalId) : Promise.resolve([])), [goalId]);
}

export function useAgents() {
  return useAsyncData(() => api.listAgents());
}

export function useSettings() {
  return useAsyncData(() => api.getSettings());
}

export function useProjects() {
  return useAsyncData(() => api.listProjects());
}

export function useHistory(goalId?: string, limit?: number) {
  return useAsyncData(() => api.getHistory(goalId, limit), [goalId, limit]);
}

export function useWebSocket(onEvent: (event: Record<string, unknown>) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!shouldEnableWebSocket()) {
      return;
    }

    let isShuttingDown = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let ws: ReturnType<ReturnType<typeof createEdenClient>["ws"]["subscribe"]> | null = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (isShuttingDown) {
        return;
      }

      const client = createEdenClient();
      ws = client.ws.subscribe();

      ws.on("open", () => {
        reconnectAttempts = 0;
      });

      ws.subscribe((event: { data: unknown }) => {
        const message = event.data;
        if (
          message &&
          typeof message === "object" &&
          "type" in message &&
          "data" in message &&
          message.type === "event"
        ) {
          onEventRef.current(message.data as Record<string, unknown>);
        }
      });

      ws.on("close", () => {
        if (isShuttingDown) {
          return;
        }

        const delay = Math.min(
          WS_BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts),
          WS_MAX_RECONNECT_DELAY_MS,
        );
        reconnectAttempts++;

        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, delay);
      });

      ws.on("error", () => {});
    };

    connect();

    return () => {
      isShuttingDown = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      ws?.close();
    };
  }, []);
}
