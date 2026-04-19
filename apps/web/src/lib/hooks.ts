import { useState, useEffect, useCallback, useRef } from "react";
import { treaty } from "@elysiajs/eden";
import { api, resolveApiUrl } from "./api";

const WS_BASE_RECONNECT_DELAY_MS = 1000;
const WS_MAX_RECONNECT_DELAY_MS = 30000;

function getWsBaseUrl() {
  const apiUrl = new URL(resolveApiUrl("/ws"));
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = "";
  apiUrl.search = "";
  apiUrl.hash = "";
  return apiUrl.toString().replace(/\/$/, "");
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
    let isShuttingDown = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let ws: {
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      close: () => void;
    } | null = null;
    let reconnectAttempts = 0;

    const connect = () => {
      if (isShuttingDown) {
        return;
      }

      ws = (treaty(getWsBaseUrl()).ws as any).subscribe();

      ws!.on("message", (message: any) => {
        if (message?.type === "event" && message.data) {
          onEventRef.current(message.data as Record<string, unknown>);
        }
      });

      ws!.on("open", () => {
        reconnectAttempts = 0;
      });

      ws!.on("close", () => {
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
