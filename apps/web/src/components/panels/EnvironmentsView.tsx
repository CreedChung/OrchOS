import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
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
  Download01Icon,
  Loading01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DirectoryPickerDialog } from "@/components/ui/directory-picker-dialog";
import { api, type DetectedRuntime } from "@/lib/api";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { RuntimeProfile, Project } from "@/lib/types";

interface EnvironmentsViewProps {
  runtimes: RuntimeProfile[];
  projects: Project[];
  onRefresh: () => void;
}

// ── Projects Tab ──────────────────────────────────────────

function ProjectsTab({
  projects: initialProjects,
  onRefresh,
  createRequestKey,
}: {
  projects: Project[];
  onRefresh: () => void;
  createRequestKey: number;
}) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"clone" | "local">("clone");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", path: "", repositoryUrl: "" });
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneResults, setCloneResults] = useState<
    Record<string, { success: boolean; output: string; error?: string; path: string }>
  >({});
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    if (createRequestKey === 0) return;
    setEditingId(null);
    setFormData({ name: "", path: "", repositoryUrl: "" });
    setFormMode("clone");
    setShowForm(true);
  }, [createRequestKey]);

  // Auto-fill name and path from repo URL
  useEffect(() => {
    if (formData.repositoryUrl && formMode === "clone") {
      const repoName =
        formData.repositoryUrl
          .split("/")
          .pop()
          ?.replace(/\.git$/, "") || "";
      if (repoName && !formData.name) {
        setFormData((prev) => ({
          ...prev,
          name: repoName.charAt(0).toUpperCase() + repoName.slice(1),
          path: `~/Projects/${repoName}`,
        }));
      }
    }
  }, [formData.repositoryUrl, formMode]);

  const handleCreate = async () => {
    if (!formData.name || !formData.path) return;
    setLoading(true);
    try {
      await api.createProject({
        name: formData.name,
        path: formData.path,
        repositoryUrl:
          formMode === "clone" ? formData.repositoryUrl.trim() || undefined : undefined,
      });
      setFormData({ name: "", path: "", repositoryUrl: "" });
      setShowForm(false);
      onRefresh();

      // Auto-clone if repository URL provided
      if (formMode === "clone" && formData.repositoryUrl) {
        // We'll clone after the project is created (need to get the new project ID)
        setTimeout(async () => {
          const newProjects = await api.listProjects();
          const newProject = newProjects.find(
            (p) => p.name === formData.name && p.repositoryUrl === formData.repositoryUrl,
          );
          if (newProject) {
            handleClone(newProject.id);
          }
        }, 500);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setFormData({
      name: project.name,
      path: project.path,
      repositoryUrl: project.repositoryUrl || "",
    });
    setFormMode(project.repositoryUrl ? "clone" : "local");
    setShowForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.path) return;
    setLoading(true);
    try {
      await api.updateProject(editingId, {
        name: formData.name,
        path: formData.path,
        repositoryUrl: formData.repositoryUrl.trim() || undefined,
      });
      setFormData({ name: "", path: "", repositoryUrl: "" });
      setEditingId(null);
      setShowForm(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(m.env_delete_project_confirm())) return;
    try {
      await api.deleteProject(id);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleClone = async (id: string, force: boolean = false) => {
    setCloningId(id);
    try {
      const result = await api.cloneProject(id, { force });
      setCloneResults((prev) => ({ ...prev, [id]: result }));
    } catch (err) {
      console.error("Failed to clone:", err);
      setCloneResults((prev) => ({
        ...prev,
        [id]: {
          success: false,
          output: "",
          error: err instanceof Error ? err.message : "Clone failed",
          path: "",
        },
      }));
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{m.env_projects_desc()}</p>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Mode selector */}
          {!editingId && (
            <Tabs value={formMode} onValueChange={(v) => setFormMode(v as "clone" | "local")}>
              <TabsList>
                <TabsTrigger value="clone">
                  <HugeiconsIcon icon={Download01Icon} className="size-4" />
                  Clone Remote
                </TabsTrigger>
                <TabsTrigger value="local">
                  <HugeiconsIcon icon={FolderIcon} className="size-4" />
                  Import Local
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {formMode === "clone" ? (
            /* Clone mode: repository URL first */
            <div className="space-y-3">
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder={m.env_project_path_placeholder()}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                    readOnly
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDirectoryPicker(true)}
                    title="Browse for directory"
                  >
                    <HugeiconsIcon icon={FolderIcon} className="size-3.5 mr-1" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Auto-generated from repo name. Click Browse to choose a different location.
                </p>
              </div>
            </div>
          ) : (
            /* Local mode: directory path input */
            <div className="space-y-3">
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
                <label className="text-xs text-muted-foreground">Local Directory</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="/Users/username/Projects/my-project"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                    readOnly
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDirectoryPicker(true)}
                    title="Browse for directory"
                  >
                    <HugeiconsIcon icon={FolderIcon} className="size-3.5 mr-1" />
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Click Browse to select your local project directory
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={loading || !formData.name || !formData.path}
            >
              {loading
                ? m.creating()
                : editingId
                  ? m.save()
                  : formMode === "clone"
                    ? "Clone & Create"
                    : "Import Project"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              {m.cancel()}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {projects.map((project) => {
          const isCloning = cloningId === project.id;
          const cloneResult = cloneResults[project.id];
          const hasRepo = cloneResult?.success;

          return (
            <div
              key={project.id}
              className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
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
                    {hasRepo && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-500 border-emerald-500/30"
                      >
                        Cloned
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{project.path}</p>
                  {project.repositoryUrl && (
                    <p className="text-xs text-muted-foreground/60 truncate font-mono mt-0.5">
                      {project.repositoryUrl}
                    </p>
                  )}
                </div>
                {project.repositoryUrl && (
                  <button
                    onClick={() => handleClone(project.id, !!cloneResult?.success)}
                    disabled={isCloning}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isCloning
                        ? "bg-muted text-muted-foreground cursor-wait"
                        : "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                    title={isCloning ? "Cloning..." : "Clone repository"}
                  >
                    <HugeiconsIcon
                      icon={isCloning ? Loading01Icon : Download01Icon}
                      className={cn("size-3.5", isCloning && "animate-spin")}
                    />
                    {isCloning ? "Cloning..." : "Clone"}
                  </button>
                )}
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

              {/* Clone result/error */}
              {cloneResult && !cloneResult.success && cloneResult.error && (
                <div className="ml-11 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {cloneResult.error}
                </div>
              )}
              {cloneResult?.success && (
                <div className="ml-11 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  Cloned to: {cloneResult.path}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {projects.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
          <HugeiconsIcon
            icon={FolderIcon}
            className="mx-auto size-6 text-muted-foreground/30 mb-2"
          />
          <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{m.env_no_projects_desc()}</p>
        </div>
      )}

      <DirectoryPickerDialog
        open={showDirectoryPicker}
        onOpenChange={setShowDirectoryPicker}
        currentPath={formData.path || undefined}
        onSelect={(selectedPath) => {
          setFormData((prev) => {
            // Auto-fill name from directory if empty
            const dirName = selectedPath.split("/").pop() || selectedPath;
            const displayName = dirName.charAt(0).toUpperCase() + dirName.slice(1);
            return {
              ...prev,
              path: selectedPath,
              name: prev.name || displayName,
            };
          });
        }}
      />
    </div>
  );
}

// ── Runtimes Tab ──────────────────────────────────────────

function RuntimesTab({
  runtimes,
  onRefresh,
}: {
  runtimes: RuntimeProfile[];
  onRefresh: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [available, setAvailable] = useState<DetectedRuntime[]>([]);
  const [unavailable, setUnavailable] = useState<DetectedRuntime[]>([]);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registerResults, setRegisterResults] = useState<Record<string, "ok" | "skip" | "fail">>(
    {},
  );

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    setRegisterResults({});
    try {
      const res = await api.detectRuntimes();
      setAvailable(res.available);
      setUnavailable(res.unavailable);
    } catch (err) {
      console.error("Failed to detect runtimes:", err);
    } finally {
      setDetecting(false);
    }
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    handleDetect();
  }, [handleDetect]);

  const handleRegister = async (runtimeId: string) => {
    setRegistering(runtimeId);
    try {
      await api.registerDetectedRuntimes({ runtimeIds: [runtimeId] });
      setRegisterResults((prev) => ({ ...prev, [runtimeId]: "ok" }));
      onRefresh();
    } catch {
      setRegisterResults((prev) => ({ ...prev, [runtimeId]: "fail" }));
    } finally {
      setRegistering(null);
    }
  };

  const handleRegisterAll = async () => {
    setRegistering("__all__");
    try {
      await api.registerDetectedRuntimes({ registerAll: true });
      onRefresh();
    } catch (err) {
      console.error("Failed to register all:", err);
    } finally {
      setRegistering(null);
    }
  };

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
              <HugeiconsIcon
                icon={detecting ? RefreshIcon : Rocket01Icon}
                className={cn("size-3.5 mr-1.5", detecting && "animate-spin")}
              />
              {detecting ? m.scanning() : m.detect_btn()}
            </Button>
            {available.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegisterAll}
                disabled={registering === "__all__"}
              >
                {registering === "__all__" ? m.registering() : m.register_all()}
              </Button>
            )}
          </div>

          {/* Detected available */}
          {available.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{m.available()}</span>
              {available.map((runtime) => {
                const result = registerResults[runtime.id];
                const alreadyRegistered = runtimes.some(
                  (r) => r.registryId === runtime.id || r.command === runtime.command,
                );
                return (
                  <div
                    key={runtime.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
                  >
                    <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10">
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="size-3.5 text-emerald-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{runtime.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{runtime.command}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {runtime.communicationMode === "acp-native"
                        ? "ACP Native"
                        : runtime.communicationMode === "acp-adapter"
                          ? "ACP Adapter"
                          : "CLI Fallback"}
                    </Badge>
                    {result === "ok" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-500 border-emerald-500/30"
                      >
                        {m.agent_registered({ name: "" }).trim()}
                      </Badge>
                    ) : alreadyRegistered ? (
                      <Badge variant="outline" className="text-[10px]">
                        {m.agent_already_registered({ name: "" }).trim()}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegister(runtime.id)}
                        disabled={registering === runtime.id}
                      >
                        {registering === runtime.id ? m.registering() : m.register()}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Detected unavailable */}
          {unavailable.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">{m.not_installed()}</span>
              {unavailable.map((runtime) => (
                <div
                  key={runtime.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 opacity-60"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{runtime.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{runtime.command}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {runtime.communicationMode === "acp-native"
                      ? "ACP Native"
                      : runtime.communicationMode === "acp-adapter"
                        ? "ACP Adapter"
                        : "CLI Fallback"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {m.not_found()}
                  </Badge>
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
          {runtimes.length > 0 ? (
            <div className="space-y-2">
              {runtimes.map((runtime) => (
                <div
                  key={runtime.id}
                  className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
                >
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                    <HugeiconsIcon icon={CodeIcon} className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground">{runtime.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{runtime.command}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {runtime.communicationMode === "acp-native"
                      ? "ACP Native"
                      : runtime.communicationMode === "acp-adapter"
                        ? "ACP Adapter"
                        : "CLI Fallback"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {runtime.model}
                  </Badge>
                  <button
                    onClick={() =>
                      api.updateRuntime(runtime.id, { enabled: !runtime.enabled }).then(onRefresh)
                    }
                    className="text-muted-foreground hover:text-foreground"
                    title={runtime.enabled ? m.disable() : m.enable()}
                  >
                    {runtime.enabled ? (
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
              <p className="text-xs text-muted-foreground/60 mt-1">
                {m.no_runtimes_registered_desc()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Env Vars Tab ──────────────────────────────────────────

interface EnvVar {
  id: string;
  key: string;
  value: string;
  scope: "global" | "project";
  projectId?: string;
}

function EnvVarsTab() {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    key: "",
    value: "",
    scope: "global" as "global" | "project",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Load from localStorage for persistence
  useEffect(() => {
    const stored = localStorage.getItem("orchos-env-vars");
    if (stored) {
      try {
        setEnvVars(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("orchos-env-vars", JSON.stringify(envVars));
  }, [envVars]);

  const handleAdd = () => {
    if (!formData.key || !formData.value) return;
    const newVar: EnvVar = {
      id: `env_${Date.now()}`,
      key: formData.key,
      value: formData.value,
      scope: formData.scope,
    };
    setEnvVars((prev) => [...prev, newVar]);
    setFormData({ key: "", value: "", scope: "global" });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setEnvVars((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdate = (id: string) => {
    setEnvVars((prev) => prev.map((v) => (v.id === id ? { ...v, value: editValue } : v)));
    setEditingId(null);
  };

  const maskValue = (val: string) => {
    if (val.length <= 4) return "****";
    return val.slice(0, 2) + "*".repeat(Math.min(val.length - 4, 8)) + val.slice(-2);
  };

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
                <Badge variant="outline" className="text-[10px]">
                  {envVar.scope === "global" ? m.scope_global() : m.scope_project()}
                </Badge>
              </div>
              {editingId === envVar.id ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-mono"
                  />
                  <Button size="sm" onClick={() => handleUpdate(envVar.id)}>
                    {m.save()}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    {m.cancel()}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">{maskValue(envVar.value)}</p>
              )}
            </div>
            {editingId !== envVar.id && (
              <button
                onClick={() => {
                  setEditingId(envVar.id);
                  setEditValue(envVar.value);
                }}
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
          <HugeiconsIcon
            icon={VariableIcon}
            className="mx-auto size-6 text-muted-foreground/30 mb-2"
          />
          <p className="text-sm text-muted-foreground">{m.env_no_vars()}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{m.env_no_vars_desc()}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────

export function EnvironmentsView({ runtimes, projects, onRefresh }: EnvironmentsViewProps) {
  const { environmentSection: activeSection, setEnvironmentSection } = useUIStore();
  const [projectCreateRequestKey, setProjectCreateRequestKey] = useState(0);
  const sections = [
    {
      id: "projects" as const,
      title: m.env_projects(),
      icon: FolderIcon,
    },
    {
      id: "runtimes" as const,
      title: m.runtimes(),
      icon: Rocket01Icon,
    },
    {
      id: "env-vars" as const,
      title: m.env_variables(),
      icon: VariableIcon,
    },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex h-full w-72 flex-col border-r border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{m.environments()}</h2>
          {activeSection === "projects" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setProjectCreateRequestKey((current) => current + 1)}
              title={m.add()}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
            </Button>
          )}
          {activeSection !== "projects" && <div className="size-8 shrink-0" aria-hidden="true" />}
        </div>

        <div className="grid grid-cols-3 gap-1 border-b border-border p-2">
          {sections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => setEnvironmentSection(section.id)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground/80 hover:bg-accent/50",
                )}
                type="button"
              >
                <HugeiconsIcon icon={section.icon} className="size-3.5 shrink-0" />
                <span className="truncate">{section.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {activeSection === "projects" && (
            <div className="space-y-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-foreground/80"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <HugeiconsIcon icon={FolderIcon} className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{project.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{project.path}</p>
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="py-8 text-center">
                  <HugeiconsIcon
                    icon={FolderIcon}
                    className="mx-auto mb-2 size-6 text-muted-foreground/30"
                  />
                  <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">{m.env_no_projects_desc()}</p>
                </div>
              )}
            </div>
          )}

          {activeSection === "runtimes" && (
            <div className="space-y-1">
              {runtimes.map((runtime) => (
                <div
                  key={runtime.id}
                  className="flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-foreground/80"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <HugeiconsIcon icon={CodeIcon} className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium text-foreground">{runtime.name}</p>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                          runtime.enabled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {runtime.enabled ? m.active() : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{runtime.command}</p>
                  </div>
                </div>
              ))}

              {runtimes.length === 0 && (
                <div className="py-8 text-center">
                  <HugeiconsIcon
                    icon={Rocket01Icon}
                    className="mx-auto mb-2 size-6 text-muted-foreground/30"
                  />
                  <p className="text-sm text-muted-foreground">{m.no_runtimes_registered()}</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">{m.no_runtimes_registered_desc()}</p>
                </div>
              )}
            </div>
          )}

          {activeSection === "env-vars" && (
            <div className="py-8 text-center">
              <HugeiconsIcon
                icon={VariableIcon}
                className="mx-auto mb-2 size-6 text-muted-foreground/30"
              />
              <p className="text-sm text-muted-foreground">{m.env_no_vars()}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{m.env_no_vars_desc()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-6">
          {activeSection === "projects" && (
            <ProjectsTab
              projects={projects}
              onRefresh={onRefresh}
              createRequestKey={projectCreateRequestKey}
            />
          )}
          {activeSection === "runtimes" && <RuntimesTab runtimes={runtimes} onRefresh={onRefresh} />}
          {activeSection === "env-vars" && <EnvVarsTab />}
        </div>
      </div>
    </div>
  );
}
