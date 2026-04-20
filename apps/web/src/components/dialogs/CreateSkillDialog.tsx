import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type SkillRepositoryAnalysis } from "@/lib/api";
import type { Project } from "@/lib/types";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";

interface CreateSkillDialogProps {
  open: boolean;
  projects: Project[];
  onClose: () => void;
  onCreated: () => void;
}

type DialogMode = "manual" | "repository";
type SkillScope = "global" | "project";

const riskTone: Record<SkillRepositoryAnalysis["riskLevel"], string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  high: "border-red-500/30 bg-red-500/10 text-red-600",
};

export function CreateSkillDialog({ open, projects, onClose, onCreated }: CreateSkillDialogProps) {
  const [mode, setMode] = useState<DialogMode>("manual");
  const [manualForm, setManualForm] = useState({
    name: "",
    description: "",
    scope: "global" as SkillScope,
    projectId: "",
  });
  const [repoForm, setRepoForm] = useState({
    source: "",
    scope: "global" as SkillScope,
    projectId: "",
  });
  const [analysis, setAnalysis] = useState<SkillRepositoryAnalysis | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [allowHighRisk, setAllowHighRisk] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasProjects = projects.length > 0;
  const selectedCount = selectedSkills.length;

  useEffect(() => {
    if (!open) {
      setMode("manual");
      setManualForm({ name: "", description: "", scope: "global", projectId: "" });
      setRepoForm({ source: "", scope: "global", projectId: "" });
      setAnalysis(null);
      setSelectedSkills([]);
      setAllowHighRisk(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (manualForm.scope === "project" && !manualForm.projectId && hasProjects) {
      setManualForm((current) => ({ ...current, projectId: projects[0].id }));
    }
  }, [manualForm.scope, manualForm.projectId, hasProjects, projects]);

  useEffect(() => {
    if (repoForm.scope === "project" && !repoForm.projectId && hasProjects) {
      setRepoForm((current) => ({ ...current, projectId: projects[0].id }));
    }
  }, [repoForm.scope, repoForm.projectId, hasProjects, projects]);

  const canCreateManual =
    manualForm.name.trim().length > 0 &&
    (manualForm.scope === "global" || Boolean(manualForm.projectId));
  const canAnalyzeRepository =
    repoForm.source.trim().length > 0 &&
    (repoForm.scope === "global" || Boolean(repoForm.projectId));

  const analyzeHint = useMemo(() => {
    if (repoForm.scope === "project" && !hasProjects) {
      return m.skill_install_requires_project();
    }
    return null;
  }, [repoForm.scope, hasProjects]);

  const handleCreate = async () => {
    if (!canCreateManual) return;

    setManualLoading(true);
    setError(null);
    try {
      await api.createSkill({
        name: manualForm.name.trim(),
        description: manualForm.description.trim() || undefined,
        scope: manualForm.scope,
        projectId: manualForm.scope === "project" ? manualForm.projectId : undefined,
        sourceType: "manual",
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setManualLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!canAnalyzeRepository) return;

    setAnalysisLoading(true);
    setError(null);
    setAnalysis(null);
    setSelectedSkills([]);
    setAllowHighRisk(false);

    try {
      const result = await api.analyzeSkillRepository({
        source: repoForm.source.trim(),
        scope: repoForm.scope,
        projectId: repoForm.scope === "project" ? repoForm.projectId : undefined,
      });
      setAnalysis(result);
      setSelectedSkills(result.installableSkills.map((candidate) => candidate.relativePath));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!analysis || selectedCount === 0) return;

    setInstallLoading(true);
    setError(null);
    try {
      await api.installSkillRepository({
        analysisId: analysis.analysisId,
        selectedSkills,
        allowHighRisk,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstallLoading(false);
    }
  };

  const toggleSkillSelection = (relativePath: string) => {
    setSelectedSkills((current) =>
      current.includes(relativePath)
        ? current.filter((item) => item !== relativePath)
        : [...current, relativePath],
    );
  };

  if (!open) return null;

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={m.skills()}
      description={m.skill_install_intro()}
      size="xl"
      bodyClassName="space-y-4 pt-5"
      footer={
        <>
          <Button size="sm" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>

          {mode === "manual" ? (
            <Button size="sm" onClick={handleCreate} disabled={manualLoading || !canCreateManual}>
              {manualLoading ? m.creating() : m.create()}
            </Button>
          ) : analysis ? (
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={
                installLoading ||
                selectedCount === 0 ||
                (analysis.riskLevel === "high" && !allowHighRisk)
              }
            >
              {installLoading ? m.installing_skills() : m.install_skills()}
            </Button>
          ) : (
            <Button size="sm" onClick={handleAnalyze} disabled={analysisLoading || !canAnalyzeRepository}>
              {analysisLoading ? m.analyzing_repository() : m.analyze_repository()}
            </Button>
          )}
        </>
      }
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as DialogMode)}>
        <TabsList>
          <TabsTrigger value="manual">{m.skill_mode_manual()}</TabsTrigger>
          <TabsTrigger value="repository">{m.skill_mode_repository()}</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "manual" ? (
        <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">{m.skill_name()}</label>
              <input
                type="text"
                value={manualForm.name}
                onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                placeholder={m.skill_name_placeholder()}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{m.skill_description()}</label>
              <input
                type="text"
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                placeholder={m.skill_description_placeholder()}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">{m.scope()}</label>
                <Select
                  value={manualForm.scope}
                  onValueChange={(value) =>
                    setManualForm((current) => ({
                      ...current,
                      scope: value as SkillScope,
                      projectId:
                        value === "project" ? current.projectId || projects[0]?.id || "" : "",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue>
                      {manualForm.scope === "global" ? m.scope_global() : m.scope_project()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="global">{m.scope_global()}</SelectItem>
                      <SelectItem value="project">{m.scope_project()}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {manualForm.scope === "project" ? (
                <div>
                  <label className="text-xs text-muted-foreground">{m.selected_project()}</label>
                  <Select
                    value={manualForm.projectId}
                    onValueChange={(value) =>
                      setManualForm((current) => ({ ...current, projectId: value ?? "" }))
                    }
                  >
                    <SelectTrigger className="mt-1" disabled={!hasProjects}>
                      <SelectValue>
                        {projects.find((p) => p.id === manualForm.projectId)?.name || m.select_project()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
        </div>
      ) : (
        <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">{m.repository_source()}</label>
              <input
                type="text"
                value={repoForm.source}
                onChange={(e) => setRepoForm((current) => ({ ...current, source: e.target.value }))}
                placeholder={m.repository_source_placeholder()}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">{m.scope()}</label>
                <Select
                  value={repoForm.scope}
                  onValueChange={(value) =>
                    setRepoForm((current) => ({
                      ...current,
                      scope: value as SkillScope,
                      projectId:
                        value === "project" ? current.projectId || projects[0]?.id || "" : "",
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue>
                      {repoForm.scope === "global" ? m.scope_global() : m.scope_project()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="global">{m.scope_global()}</SelectItem>
                      <SelectItem value="project">{m.scope_project()}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {repoForm.scope === "project" ? (
                <div>
                  <label className="text-xs text-muted-foreground">{m.selected_project()}</label>
                  <Select
                    value={repoForm.projectId}
                    onValueChange={(value) =>
                      setRepoForm((current) => ({ ...current, projectId: value ?? "" }))
                    }
                  >
                    <SelectTrigger className="mt-1" disabled={!hasProjects}>
                      <SelectValue>
                        {projects.find((p) => p.id === repoForm.projectId)?.name || m.select_project()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {analyzeHint ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                {analyzeHint}
              </p>
            ) : null}

            {analysis ? (
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.safety_review()}</p>
                    <p className="text-xs text-muted-foreground">{analysis.summary}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                      riskTone[analysis.riskLevel],
                    )}
                  >
                    {analysis.riskLevel}
                  </span>
                </div>

                <div className="mb-3 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{m.install_target()}</span>{" "}
                  {analysis.installTarget}
                </div>

                {analysis.warnings.length > 0 ? (
                  <div className="mb-3 rounded-lg border border-border/60 bg-card px-3 py-2">
                    <p className="mb-2 text-xs font-medium text-foreground">
                      {m.skill_analysis_warnings()}
                    </p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {analysis.warnings.map((warning) => (
                        <li key={warning} className="flex gap-2">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{m.discovered_skills()}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCount}/{analysis.installableSkills.length}
                    </p>
                  </div>

                  {analysis.installableSkills.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
                      {m.no_installable_skills()}
                    </p>
                  ) : (
                    analysis.installableSkills.map((candidate) => (
                      <label
                        key={candidate.relativePath}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(candidate.relativePath)}
                          onChange={() => toggleSkillSelection(candidate.relativePath)}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                          {candidate.description ? (
                            <p className="text-xs text-muted-foreground">{candidate.description}</p>
                          ) : null}
                          <p className="text-[11px] text-muted-foreground/80">
                            {candidate.relativePath}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {analysis.riskLevel === "high" ? (
                  <label className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
                    <input
                      type="checkbox"
                      checked={allowHighRisk}
                      onChange={(e) => setAllowHighRisk(e.target.checked)}
                      className="mt-1"
                    />
                    <span>{m.allow_high_risk_install()}</span>
                  </label>
                ) : null}
              </div>
            ) : null}
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </AppDialog>
  );
}
