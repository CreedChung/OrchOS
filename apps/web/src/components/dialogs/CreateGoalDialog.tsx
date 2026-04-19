import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon, FolderGitIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
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
import type { Project } from "@/lib/types";

interface CreateGoalDialogProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  onSubmit: (data: {
    title: string;
    description?: string;
    successCriteria: string[];
    constraints?: string[];
    projectId?: string;
  }) => void;
}

export function CreateGoalDialog({ open, onClose, projects, onSubmit }: CreateGoalDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<string[]>([""]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string>("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validCriteria = criteria.filter((c) => c.trim());
    if (!title.trim() || validCriteria.length === 0) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      successCriteria: validCriteria,
      constraints: constraints.filter((c) => c.trim()),
      projectId: projectId || undefined,
    });
    setTitle("");
    setDescription("");
    setCriteria([""]);
    setConstraints([]);
    setProjectId("");
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={m.create_new_goal()}
      size="lg"
      bodyClassName="pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button
            size="sm"
            type="submit"
            form="create-goal-form"
            disabled={!title.trim() || criteria.filter((c) => c.trim()).length === 0}
          >
            {m.create_goal()}
          </Button>
        </>
      }
    >
      <form id="create-goal-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.goal_title()}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={m.goal_title_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.description()}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={m.description_placeholder()}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Project Selection */}
          {projects.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                <HugeiconsIcon icon={FolderGitIcon} className="size-3 inline mr-1" />
                {m.project()}
              </label>
              <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={m.no_project()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="">{m.no_project()}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Success Criteria */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.success_criteria()}
            </label>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const next = [...criteria];
                      next[i] = e.target.value;
                      setCriteria(next);
                    }}
                    placeholder={m.criteria_placeholder()}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCriteria([...criteria, ""])}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3" /> {m.add_criterion()}
              </button>
            </div>
          </div>

          {/* Constraints */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.constraints()}
            </label>
            <div className="space-y-2">
              {constraints.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const next = [...constraints];
                      next[i] = e.target.value;
                      setConstraints(next);
                    }}
                    placeholder={m.constraints_placeholder()}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setConstraints(constraints.filter((_, j) => j !== i))}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setConstraints([...constraints, ""])}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3" /> {m.add_constraint()}
              </button>
            </div>
          </div>
      </form>
    </AppDialog>
  );
}
