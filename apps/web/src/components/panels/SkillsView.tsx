import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wrench01Icon,
  Add01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateSkillDialog } from "@/components/dialogs/CreateSkillDialog";
import { api, type SkillProfile } from "@/lib/api";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface SkillsViewProps {
  skills: SkillProfile[];
  projects: Project[];
  onRefresh: () => void;
  scopeFilter?: "all" | "global" | "project";
}

export function SkillsView({
  skills: initialSkills,
  projects,
  onRefresh,
  scopeFilter = "all",
}: SkillsViewProps) {
  const [skills, setSkills] = useState<SkillProfile[]>(initialSkills);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);

  useEffect(() => {
    setSkills(initialSkills);
  }, [initialSkills]);

  const handleCreated = async () => {
    onRefresh();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await api.toggleSkill(id, !enabled);
      onRefresh();
    } catch (err) {
      console.error("Failed to toggle skill:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setSkillToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!skillToDelete) return;
    try {
      await api.deleteSkill(skillToDelete);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete skill:", err);
    } finally {
      setSkillToDelete(null);
    }
  };

  const filteredSkills = useMemo(
    () => (scopeFilter === "all" ? skills : skills.filter((s) => s.scope === scopeFilter)),
    [scopeFilter, skills],
  );

  const activeSkill = filteredSkills.find((skill) => skill.id === activeSkillId) ?? null;

  useEffect(() => {
    if (filteredSkills.length === 0) {
      setActiveSkillId(null);
      return;
    }

    if (!filteredSkills.some((skill) => skill.id === activeSkillId)) {
      setActiveSkillId(filteredSkills[0].id);
    }
  }, [filteredSkills, activeSkillId]);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const skillScopeLabel = (skill: SkillProfile) => {
    if (skill.scope === "global") return "Global";
    if (skill.projectId) return projectNameById.get(skill.projectId) ?? m.project();
    return m.project();
  };

  const sourceTypeLabel = (skill: SkillProfile) =>
    skill.sourceType === "repository" ? "Repository" : "Manual";

  return (
    <>
    <div className="flex flex-1 overflow-hidden">
      <div className="flex h-full w-72 flex-col border-r border-border bg-background">
        <div className="flex h-14 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{m.skills()}</h2>
          <Button variant="ghost" size="icon-sm" onClick={() => setCreateOpen(true)} title={m.add()}>
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {filteredSkills.map((skill) => {
              const isActive = skill.id === activeSkillId;

              return (
                <button
                  key={skill.id}
                  onClick={() => setActiveSkillId(skill.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/50",
                    !skill.enabled && "opacity-60",
                  )}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <HugeiconsIcon icon={Wrench01Icon} className="size-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-xs font-medium", isActive && "text-accent-foreground")}>
                      {skill.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{skillScopeLabel(skill)}</p>
                    {skill.description && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground/70">
                        {skill.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {filteredSkills.length === 0 && skills.length > 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {scopeFilter === "global" ? m.no_global_skills() : m.no_project_skills()}
                </p>
              </div>
            )}

            {skills.length === 0 && (
              <div className="py-8 text-center">
                <HugeiconsIcon
                  icon={Wrench01Icon}
                  className="mx-auto mb-2 size-6 text-muted-foreground/30"
                />
                <p className="text-sm text-muted-foreground">{m.no_skills()}</p>
                <p className="mt-1 text-xs text-muted-foreground/60">{m.no_skills_desc()}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeSkill ? (
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-3xl space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <HugeiconsIcon icon={Wrench01Icon} className="size-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-foreground">{activeSkill.name}</h1>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {sourceTypeLabel(activeSkill)} • {skillScopeLabel(activeSkill)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(activeSkill.id, activeSkill.enabled)}
                  >
                    <HugeiconsIcon
                      icon={activeSkill.enabled ? ToggleRight : ToggleLeft}
                      className={cn("mr-1.5 size-4", activeSkill.enabled && "text-emerald-500")}
                    />
                    {activeSkill.enabled ? m.disable() : m.enable()}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(activeSkill.id)}>
                    <HugeiconsIcon icon={Delete02Icon} className="mr-1.5 size-4" />
                    {m.delete()}
                  </Button>
                </div>
              </div>

              <section className="rounded-lg border border-border/50 bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">Overview</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Status
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {activeSkill.enabled ? m.active() : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Description
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {activeSkill.description || m.no_skills_desc()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Install Path
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                      {activeSkill.installPath || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Manifest Path
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                      {activeSkill.manifestPath || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                      Source URL
                    </p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground/80">
                      {activeSkill.sourceUrl || "-"}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{m.no_skills()}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">{m.no_skills_desc()}</p>
            </div>
          </div>
        )}
      </div>
    </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete()}
        description={m.delete_skill_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />

      <CreateSkillDialog
        open={createOpen}
        projects={projects}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
