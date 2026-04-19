import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Shield01Icon } from "@hugeicons/core-free-icons";
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
import type { Problem } from "@/lib/types";

interface CreateRuleDialogProps {
  open: boolean;
  onClose: () => void;
  problem: Problem | null;
  onSubmit: (data: { name: string; condition: string; action: string }) => void;
}

const conditionLabels: Record<string, string> = {
  test_failed: m.test_failed(),
  lint_error: m.lint_error(),
  lint_warning: m.lint_warning(),
  review_rejected: m.review_rejected(),
  build_failed: m.build_failed(),
  build_success: m.build_success(),
};

const actionLabels: Record<string, string> = {
  auto_fix: m.auto_fix_rule(),
  ignore: m.ignore_rule(),
  assign_reviewer: m.assign_reviewer(),
  archive: m.archive(),
  notify: m.notify(),
};

function inferCondition(problem: Problem): string {
  const title = problem.title.toLowerCase();
  if (title.includes("test")) return "test_failed";
  if (title.includes("lint")) return "lint_error";
  if (title.includes("review") || title.includes("pr") || title.includes("reject"))
    return "review_rejected";
  if (title.includes("build")) return "build_failed";
  return "test_failed";
}

function inferAction(problem: Problem): string {
  const title = problem.title.toLowerCase();
  if (title.includes("lint") || title.includes("info") || title.includes("success"))
    return "ignore";
  if (title.includes("review")) return "assign_reviewer";
  return "auto_fix";
}

export function CreateRuleDialog({ open, onClose, problem, onSubmit }: CreateRuleDialogProps) {
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("test_failed");
  const [action, setAction] = useState("auto_fix");

  if (!open || !problem) return null;

  // Auto-fill based on problem
  const defaultName = `Auto-handle: ${problem.title}`;
  const defaultCondition = inferCondition(problem);
  const defaultAction = inferAction(problem);

  const currentName = name || defaultName;
  const currentCondition = condition || defaultCondition;
  const currentAction = action || defaultAction;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: currentName, condition: currentCondition, action: currentAction });
    setName("");
    setCondition("test_failed");
    setAction("auto_fix");
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={
        <span className="flex items-center gap-2">
          <HugeiconsIcon icon={Shield01Icon} className="size-4 text-primary" />
          <span>{m.create_rule()}</span>
        </span>
      }
      size="md"
      bodyClassName="space-y-4 pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button size="sm" type="submit" form="create-rule-form">
            {m.create_rule()}
          </Button>
        </>
      }
    >
      {/* Source problem info */}
      <div className="rounded-md border border-border/50 bg-accent/20 px-3 py-2">
          <p className="text-xs text-muted-foreground">{m.from_problem()}</p>
          <p className="text-sm font-medium text-foreground">{problem.title}</p>
          {problem.context && (
            <p className="text-xs text-muted-foreground mt-0.5">{problem.context}</p>
          )}
      </div>

      <form id="create-rule-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.rule_name()}
            </label>
            <input
              type="text"
              value={name || defaultName}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          {/* Condition -> Action */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {m.rule_logic()}
            </label>
            <div className="flex items-center gap-2">
              <Select value={condition} onValueChange={(value) => setCondition(value ?? condition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 text-muted-foreground shrink-0"
              />
              <Select value={action} onValueChange={(value) => setAction(value ?? action)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(actionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
      </form>
    </AppDialog>
  );
}
