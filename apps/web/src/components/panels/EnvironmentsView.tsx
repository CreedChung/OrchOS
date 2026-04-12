import { useState, useEffect, useCallback } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FolderIcon,
  Add01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
  Rocket01Icon,
  CodeIcon,
  RefreshIcon,
  VariableIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Link01Icon,
  Edit02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "#/components/ui/button"
import { Badge } from "#/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "#/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "#/components/ui/tabs"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select"
import { api, type DetectedAgent } from "#/lib/api"
import { cn } from "#/lib/utils"
import { m } from "#/paraglide/messages"
import type { AgentProfile, Project } from "#/lib/types"

interface EnvironmentsViewProps {
  agents: AgentProfile[]
  projects: Project[]
  onRefresh: () => void
}

// ── Projects Tab ──────────────────────────────────────────

function ProjectsTab({ projects: initialProjects, onRefresh }: { projects: Project[]; onRefresh: () => void }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", path: "", repositoryUrl: "" })
  const [loading, setLoading] = useState(false)

  useEffect(() => { setProjects(initialProjects) }, [initialProjects])

  const handleCreate = async () => {
    if (!formData.name || !formData.path) return
    setLoading(true)
    try {
      await api.createProject({
        name: formData.name,
        path: formData.path,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
      })
      setFormData({ name: "", path: "", repositoryUrl: "" })
      setShowForm(false)
      onRefresh()
    } catch (err) {
      console.error("Failed to create project:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (project: Project) => {
    setEditingId(project.id)
    setFormData({ name: project.name, path: project.path, repositoryUrl: project.repositoryUrl || "" })
    setShowForm(true)
  }

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.path) return
    setLoading(true)
    try {
      await api.updateProject(editingId, {
        name: formData.name,
        path: formData.path,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
      })
      setFormData({ name: "", path: "", repositoryUrl: "" })
      setEditingId(null)
      setShowForm(false)
      onRefresh()
    } catch (err) {
      console.error("Failed to update project:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(m.env_delete_project_confirm())) return
    try {
      await api.deleteProject(id)
      onRefresh()
    } catch (err) {
      console.error("Failed to delete project:", err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{m.env_projects_desc()}</p>
        <Button size="sm" onClick={() => {
          setEditingId(null)
          setFormData({ name: "", path: "", repositoryUrl: "" })
          setShowForm(!showForm)
        }}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
          {m.add()}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{m.env_project_name()}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={m.env_project_name_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{m.env_project_path()}</label>
            <input
              type="text"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              placeholder={m.env_project_path_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{m.env_project_repo_url()}</label>
            <input
              type="text"
              value={formData.repositoryUrl}
              onChange={(e) => setFormData({ ...formData, repositoryUrl: e.target.value })}
              placeholder={m.env_project_repo_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={editingId ? handleUpdate : handleCreate} disabled={loading || !formData.name || !formData.path}>
              {loading ? m.creating() : editingId ? m.save() : m.create()}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>
              {m.cancel()}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3"
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <HugeiconsIcon icon={FolderIcon} className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{project.name}</span>
                {project.repositoryUrl && (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
                    title={project.repositoryUrl}
                  >
                    <HugeiconsIcon icon={Link01Icon} className="size-3" />
                    {m.env_repo_link()}
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{project.path}</p>
              {project.repositoryUrl && (
                <p className="text-xs text-muted-foreground/60 truncate font-mono mt-0.5">{project.repositoryUrl}</p>
              )}
            </div>
            <button
              onClick={() => handleEdit(project)}
              className="text-muted-foreground hover:text-foreground"
              title={m.edit_status()}
            >
              <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
            </button>
            <button
              onClick={() => handleDelete(project.id)}
              className="text-muted-foreground hover:text-destructive"
              title={m.delete()}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {projects.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
          <HugeiconsIcon icon={FolderIcon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{m.env_no_projects_desc()}</p>
        </div>
      )}
    </div>
  )
}

// ── Runtimes Tab ──────────────────────────────────────────

function RuntimesTab({ agents, onRefresh }: { agents: AgentProfile[]; onRefresh: () => void }) {
  const [detecting, setDetecting] = useState(false)
  const [available, setAvailable] = useState<DetectedAgent[]>([])
  const [unavailable, setUnavailable] = useState<DetectedAgent[]>([])
  const [registering, setRegistering] = useState<string | null>(null)
  const [registerResults, setRegisterResults] = useState<Record<string, "ok" | "skip" | "fail">>({})

  const runtimeAgents = agents.filter((a) => a.cliCommand)

  const handleDetect = useCallback(async () => {
    setDetecting(true)
    setRegisterResults({})
    try {
      const res = await api.detectAgents()
      setAvailable(res.available)
      setUnavailable(res.unavailable)
    } catch (err) {
      console.error("Failed to detect agents:", err)
    } finally {
      setDetecting(false)
    }
  }, [])

  // Auto-detect on mount
  useEffect(() => {
    handleDetect()
  }, [handleDetect])

  const handleRegister = async (agentId: string) => {
    setRegistering(agentId)
    try {
      await api.registerDetectedAgents({ agentIds: [agentId] })
      setRegisterResults((prev) => ({ ...prev, [agentId]: "ok" }))
      onRefresh()
    } catch {
      setRegisterResults((prev) => ({ ...prev, [agentId]: "fail" }))
    } finally {
      setRegistering(null)
    }
  }

  const handleRegisterAll = async () => {
    setRegistering("__all__")
    try {
      await api.registerDetectedAgents({ registerAll: true })
      onRefresh()
    } catch (err) {
      console.error("Failed to register all:", err)
    } finally {
      setRegistering(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Detect section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={Rocket01Icon} className="size-4 text-primary" />
            {m.runtimes()}
          </CardTitle>
          <CardDescription className="text-xs">{m.runtimes_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleDetect} disabled={detecting}>
              <HugeiconsIcon icon={detecting ? RefreshIcon : Rocket01Icon} className={cn("size-3.5 mr-1.5", detecting && "animate-spin")} />
              {detecting ? m.scanning() : m.detect_btn()}
            </Button>
            {available.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleRegisterAll} disabled={registering === "__all__"}>
                {registering === "__all__" ? m.registering() : m.register_all()}
              </Button>
            )}
          </div>

          {/* Detected available */}
          {available.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{m.available()}</span>
              {available.map((agent) => {
                const result = registerResults[agent.id]
                const alreadyRegistered = runtimeAgents.some((a) => a.cliCommand === agent.command)
                return (
                  <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-3.5 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{agent.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{agent.command}</span>
                    </div>
                    {result === "ok" ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">{m.agent_registered({ name: "" }).trim()}</Badge>
                    ) : alreadyRegistered ? (
                      <Badge variant="outline" className="text-[10px]">{m.agent_already_registered({ name: "" }).trim()}</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleRegister(agent.id)} disabled={registering === agent.id}>
                        {registering === agent.id ? m.registering() : m.register()}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Detected unavailable */}
          {unavailable.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{m.not_installed()}</span>
              {unavailable.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 opacity-60">
                  <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{agent.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{agent.command}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{m.not_found()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered runtimes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <HugeiconsIcon icon={CodeIcon} className="size-4 text-primary" />
            {m.registered_runtimes()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runtimeAgents.length > 0 ? (
            <div className="space-y-2">
              {runtimeAgents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                    <HugeiconsIcon icon={CodeIcon} className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{agent.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{agent.cliCommand}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{agent.model}</Badge>
                  <button
                    onClick={() => api.updateAgent(agent.id, { enabled: !agent.enabled }).then(onRefresh)}
                    className="text-muted-foreground hover:text-foreground"
                    title={agent.enabled ? m.disable() : m.enable()}
                  >
                    {agent.enabled ? (
                      <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
                    ) : (
                      <HugeiconsIcon icon={ToggleLeft} className="size-5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">{m.no_runtimes_registered()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.no_runtimes_registered_desc()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Env Vars Tab ──────────────────────────────────────────

interface EnvVar {
  id: string
  key: string
  value: string
  scope: "global" | "project"
  projectId?: string
}

function EnvVarsTab() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ key: "", value: "", scope: "global" as "global" | "project" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  // Load from localStorage for persistence
  useEffect(() => {
    const stored = localStorage.getItem("orchos-env-vars")
    if (stored) {
      try { setEnvVars(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("orchos-env-vars", JSON.stringify(envVars))
  }, [envVars])

  const handleAdd = () => {
    if (!formData.key || !formData.value) return
    const newVar: EnvVar = {
      id: `env_${Date.now()}`,
      key: formData.key,
      value: formData.value,
      scope: formData.scope,
    }
    setEnvVars((prev) => [...prev, newVar])
    setFormData({ key: "", value: "", scope: "global" })
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    setEnvVars((prev) => prev.filter((v) => v.id !== id))
  }

  const handleUpdate = (id: string) => {
    setEnvVars((prev) => prev.map((v) => v.id === id ? { ...v, value: editValue } : v))
    setEditingId(null)
  }

  const maskValue = (val: string) => {
    if (val.length <= 4) return "****"
    return val.slice(0, 2) + "*".repeat(Math.min(val.length - 4, 8)) + val.slice(-2)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{m.env_vars_desc()}</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
          {m.add()}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">{m.env_var_key()}</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder={m.env_var_key_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{m.env_var_value()}</label>
            <input
              type="password"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder={m.env_var_value_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{m.scope()}</label>
            <Select
              value={formData.scope}
              onValueChange={(v) => setFormData({ ...formData, scope: v as "global" | "project" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="global">{m.scope_global()}</SelectItem>
                  <SelectItem value="project">{m.scope_project()}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!formData.key || !formData.value}>
              {m.create()}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              {m.cancel()}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {envVars.map((envVar) => (
          <div
            key={envVar.id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3"
          >
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <HugeiconsIcon icon={VariableIcon} className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium font-mono text-foreground">{envVar.key}</span>
                <Badge variant="outline" className="text-[10px]">{envVar.scope === "global" ? m.scope_global() : m.scope_project()}</Badge>
              </div>
              {editingId === envVar.id ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono"
                  />
                  <Button size="sm" onClick={() => handleUpdate(envVar.id)}>{m.save()}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>{m.cancel()}</Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">{maskValue(envVar.value)}</p>
              )}
            </div>
            {editingId !== envVar.id && (
              <button
                onClick={() => { setEditingId(envVar.id); setEditValue(envVar.value) }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {m.edit_status()}
              </button>
            )}
            <button
              onClick={() => handleDelete(envVar.id)}
              className="text-muted-foreground hover:text-destructive"
              title={m.delete()}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {envVars.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
          <HugeiconsIcon icon={VariableIcon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{m.env_no_vars()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{m.env_no_vars_desc()}</p>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────

export function EnvironmentsView({ agents, projects, onRefresh }: EnvironmentsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-foreground">{m.environments()}</h1>
          <p className="text-sm text-muted-foreground">{m.environments_desc()}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">
              <HugeiconsIcon icon={FolderIcon} className="size-3.5" />
              {m.env_projects()}
            </TabsTrigger>
            <TabsTrigger value="runtimes">
              <HugeiconsIcon icon={Rocket01Icon} className="size-3.5" />
              {m.runtimes()}
            </TabsTrigger>
            <TabsTrigger value="env-vars">
              <HugeiconsIcon icon={VariableIcon} className="size-3.5" />
              {m.env_variables()}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-4">
            <ProjectsTab projects={projects} onRefresh={onRefresh} />
          </TabsContent>

          <TabsContent value="runtimes" className="mt-4">
            <RuntimesTab agents={agents} onRefresh={onRefresh} />
          </TabsContent>

          <TabsContent value="env-vars" className="mt-4">
            <EnvVarsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
