import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderIcon,
  Add01Icon,
  Delete02Icon,
  Download01Icon,
  Link01Icon,
  Edit02Icon,
  Loading01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectoryPickerDialog } from "@/components/ui/directory-picker-dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { Project } from "@/lib/types";

interface ProjectsViewProps {
  projects: Project[];
  onRefresh: () => void;
}

export function ProjectsView({ projects, onRefresh }: ProjectsViewProps) {
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
      const currentRepoUrl = formData.repositoryUrl;
      setFormData({ name: "", path: "", repositoryUrl: "" });
      setShowForm(false);
      onRefresh();

      if (formMode === "clone" && currentRepoUrl) {
        setTimeout(async () => {
          const newProjects = await api.listProjects();
          const newProject = newProjects.find(
            (p) => p.name === formData.name && p.repositoryUrl === currentRepoUrl,
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

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", path: "", repositoryUrl: "" });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{m.project()}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{m.env_projects_desc()}</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingId(null);
              setFormData({ name: "", path: "", repositoryUrl: "" });
              setFormMode("clone");
              setShowForm(true);
            }}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
            {m.add()}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
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
              <Button size="sm" variant="outline" onClick={handleCancel}>
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
          <div className="rounded-lg border border-dashed border-border/50 py-12 text-center">
            <HugeiconsIcon
              icon={FolderIcon}
              className="mx-auto size-8 text-muted-foreground/30 mb-3"
            />
            <p className="text-sm text-muted-foreground">{m.env_no_projects()}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{m.env_no_projects_desc()}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => {
                setEditingId(null);
                setFormData({ name: "", path: "", repositoryUrl: "" });
                setFormMode("clone");
                setShowForm(true);
              }}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1.5" />
              {m.add()} {m.project()}
            </Button>
          </div>
        )}

        <DirectoryPickerDialog
          open={showDirectoryPicker}
          onOpenChange={setShowDirectoryPicker}
          currentPath={formData.path || undefined}
          onSelect={(selectedPath) => {
            setFormData((prev) => {
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
    </div>
  );
}
