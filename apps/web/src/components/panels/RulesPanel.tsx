import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  Add01Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
  Cancel01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { Rule } from "@/lib/types";

interface RulesPanelProps {
  rules: Rule[];
  onCreateRule: (data: { name: string; condition: string; action: string }) => void;
  onToggleRule: (id: string, enabled: boolean) => void;
  onDeleteRule: (id: string) => void;
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

export function RulesPanel({ rules, onCreateRule, onToggleRule, onDeleteRule }: RulesPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("test_failed");
  const [action, setAction] = useState("auto_fix");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateRule({ name: name.trim(), condition, action });
    setName("");
    setCondition("test_failed");
    setAction("auto_fix");
    setShowCreate(false);
  };

  const handleDeleteClick = (id: string) => {
    setRuleToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (ruleToDelete) {
      onDeleteRule(ruleToDelete);
      setRuleToDelete(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Shield01Icon} className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{m.automation_rules()}</h2>
          <span className="text-xs text-muted-foreground">
            ({rules.filter((r) => r.enabled).length} {m.active()})
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-3" />
          {m.new_rule()}
        </button>
      </div>

      {/* Create Rule Form */}
      {showCreate && (
        <div className="border-b border-border bg-accent/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{m.create_rule()}</span>
            <button
              onClick={() => setShowCreate(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={m.rule_name_placeholder()}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {m.when()}
            </span>
            <Select value={condition} onValueChange={(value) => setCondition(value ?? condition)}>
              <SelectTrigger>
                <SelectValue>{conditionLabels[condition]}</SelectValue>
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
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-3 text-muted-foreground" />
            <Select value={action} onValueChange={(value) => setAction(value ?? action)}>
              <SelectTrigger>
                <SelectValue>{actionLabels[action]}</SelectValue>
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
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              name.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {m.create_rule()}
          </button>
        </div>
      )}

      {/* Rules List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-colors",
                rule.enabled ? "bg-card" : "bg-muted/30 opacity-60",
              )}
            >
              <HugeiconsIcon
                icon={Shield01Icon}
                className={cn(
                  "size-4 shrink-0",
                  rule.enabled ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{rule.name}</span>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">
                    {conditionLabels[rule.condition] || rule.condition}
                  </span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-2.5" />
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">
                    {actionLabels[rule.action] || rule.action}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onToggleRule(rule.id, !rule.enabled)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title={rule.enabled ? m.disable_rule() : m.enable_rule()}
              >
                {rule.enabled ? (
                  <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
                ) : (
                  <HugeiconsIcon icon={ToggleLeft} className="size-5" />
                )}
              </button>
              <button
                onClick={() => handleDeleteClick(rule.id)}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                title={m.delete()}
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HugeiconsIcon icon={Shield01Icon} className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{m.create_rules_desc()}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete_this_rule()}
        description={m.delete_this_rule()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </div>
  );
}
