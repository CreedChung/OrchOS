import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

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

export function useSettings() {
  return useAsyncData(() => api.getSettings());
}

export function useProjects() {
  return useAsyncData(() => api.listProjects());
}

export function useHistory(goalId?: string, limit?: number) {
  return useAsyncData(() => api.getHistory(goalId, limit), [goalId, limit]);
}
