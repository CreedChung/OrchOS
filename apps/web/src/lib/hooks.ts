import { useState, useEffect, useCallback, useRef } from "react";
import { treaty } from "@elysiajs/eden";
import { api } from "./api";

const server = treaty("localhost:5173");

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
    const ws = (server.ws as any).subscribe();

    ws.on("message", (message: any) => {
      if (message?.type === "event" && message.data) {
        onEventRef.current(message.data as Record<string, unknown>);
      }
    });

    ws.on("open", () => {
      console.log("WebSocket connected");
    });

    ws.on("close", () => {
      console.log("WebSocket disconnected");
    });

    return () => {
      ws.close();
    };
  }, []);
}
