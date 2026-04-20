import { useState } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SentIcon,
  Robot02Icon,
  FolderGitIcon,
  Cancel01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { RuntimeProfile, Project } from "@/lib/types";
import { BorderBeam } from "border-beam";
import { Button } from "@/components/ui/button";

interface CommandBarProps {
  open: boolean;
  runtimes: RuntimeProfile[];
  projects: Project[];
  onSubmit: (data: { instruction: string; agentNames: string[]; projectIds: string[] }) => void;
  onClose: () => void;
}

export function CommandBar({ open, runtimes, projects, onSubmit, onClose }: CommandBarProps) {
  const [instruction, setInstruction] = useState("");
  const [selectedRuntimes, setSelectedRuntimes] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const enabledRuntimes = runtimes.filter((r) => r.enabled);

  const toggleRuntime = (name: string) => {
    setSelectedRuntimes((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const toggleProject = (id: string) => {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    onSubmit({
      instruction: instruction.trim(),
      agentNames: selectedRuntimes,
      projectIds: selectedProjects,
    });
    setInstruction("");
    setSelectedRuntimes([]);
    setSelectedProjects([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={SentIcon} className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{m.new_command()}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <BorderBeam
            size="md"
            theme="auto"
            colorVariant="ocean"
            strength={0.65}
            duration={2.6}
            className="rounded-2xl"
          >
            <div className="rounded-2xl border border-border bg-background px-4 py-4">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={m.command_placeholder()}
                rows={1}
                autoFocus
                className="min-h-[88px] w-full resize-none bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />

              <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                {enabledRuntimes.map((runtime) => {
                  const isSelected = selectedRuntimes.includes(runtime.name);
                  return (
                    <button
                      key={runtime.id}
                      type="button"
                      onClick={() => toggleRuntime(runtime.name)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/50 bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={Robot02Icon} className="size-3" />
                      {runtime.name}
                      {runtime.status === "active" && (
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
                {enabledRuntimes.length === 0 && (
                  <span className="inline-flex items-center rounded-full border border-dashed border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                    {m.no_agents_available()}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {projects.map((project) => {
                  const isSelected = selectedProjects.includes(project.id);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => toggleProject(project.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/50 bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={FolderGitIcon} className="size-3" />
                      {project.name}
                    </button>
                  );
                })}
                {projects.length === 0 && (
                  <span className="inline-flex items-center rounded-full border border-dashed border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                    {m.no_projects_configured()}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-end justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  {m.cancel()}
                </Button>
                <Button type="submit" size="icon-sm" disabled={!instruction.trim()}>
                  <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                </Button>
              </div>
            </div>
          </BorderBeam>
        </form>
      </div>
    </div>
  );
}
