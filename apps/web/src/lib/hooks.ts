import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "./api"
import type { Goal, StateEntry, Artifact, ActivityEntry, AgentProfile, ControlSettings, Project, HistoryEntry } from "./api"

function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

export function useGoals() {
  return useAsyncData(() => api.listGoals())
}

export function useGoal(id: string | null) {
  return useAsyncData(() => id ? api.getGoal(id) : Promise.resolve(null), [id])
}

export function useStates(goalId: string | null) {
  return useAsyncData(() => goalId ? api.getStates(goalId) : Promise.resolve([]), [goalId])
}

export function useArtifacts(goalId: string | null) {
  return useAsyncData(() => goalId ? api.getArtifacts(goalId) : Promise.resolve([]), [goalId])
}

export function useActivities(goalId: string | null) {
  return useAsyncData(() => goalId ? api.getActivities(goalId) : Promise.resolve([]), [goalId])
}

export function useAgents() {
  return useAsyncData(() => api.listAgents())
}

export function useSettings() {
  return useAsyncData(() => api.getSettings())
}

export function useProjects() {
  return useAsyncData(() => api.listProjects())
}

export function useHistory(goalId?: string, limit?: number) {
  return useAsyncData(() => api.getHistory(goalId, limit), [goalId, limit])
}

export function useWebSocket(onEvent: (event: Record<string, unknown>) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:5173/ws")
    wsRef.current = ws

    ws.onopen = () => {
      console.log("WebSocket connected")
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "event") {
          onEventRef.current(data.data)
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      console.log("WebSocket disconnected")
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [])
}
