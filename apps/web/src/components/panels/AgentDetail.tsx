import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  ArrowRight01Icon,
  ToggleLeft,
  ToggleRight,
  Cancel01Icon,
  Circle,
  Wrench01Icon,
  PencilEdit02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { m } from "@/paraglide/messages";
import type { AgentProfile, Rule } from "@/lib/types";

const CAPABILITY_OPTIONS = [
  { value: "write_code", labelKey: "cap_write_code" },
  { value: "fix_bug", labelKey: "cap_fix_bug" },
  { value: "run_tests", labelKey: "cap_run_tests" },
  { value: "commit", labelKey: "cap_commit" },
  { value: "review", labelKey: "cap_review" },
] as const;

const CAPABILITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  write_code: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  fix_bug: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  run_tests: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  commit: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  review: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/30",
  },
};

const statusLabelMap: Record<string, string> = {
  idle: m.status_idle(),
  active: m.status_active(),
  error: m.status_error(),
};

const capLabelMap: Record<string, string> = {
  write_code: m.cap_write_code(),
  fix_bug: m.cap_fix_bug(),
  run_tests: m.cap_run_tests(),
  commit: m.cap_commit(),
  review: m.cap_review(),
};

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

function InlineEditField({
  value,
  onSave,
  className,
  inputClassName,
  placeholder,
  mono = false,
}: {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "rounded-md border border-ring bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          mono && "font-mono text-xs",
          inputClassName,
        )}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "group/edit inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent",
        className,
      )}
    >
      <span className={cn(mono && "font-mono text-[10px]")}>{value || placeholder}</span>
      <HugeiconsIcon
        icon={PencilEdit02Icon}
        className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100"
      />
    </span>
  );
}

export function AgentDetailView({
  agent,
  rules,
  onRuleToggle,
  onRuleDelete,
  onAgentUpdated,
  onUpdateAgent,
}: {
  agent: AgentProfile;
  rules: Rule[];
  onRuleToggle: (id: string, enabled: boolean) => void;
  onRuleDelete: (id: string) => void;
  onAgentUpdated?: () => void;
  onUpdateAgent?: (
    id: string,
    data: Partial<{
      name: string;
      role: string;
      capabilities: string[];
      status: AgentProfile["status"];
      model: string;
      enabled: boolean;
      cliCommand: string;
      runtimeId: string;
      avatarUrl: string;
    }>,
  ) => Promise<void>;
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [enabledCapabilities, setEnabledCapabilities] = useState<string[]>(agent.capabilities);
  const [capsDirty, setCapsDirty] = useState(false);

  useEffect(() => {
    setEnabledCapabilities(agent.capabilities);
    setCapsDirty(false);
  }, [agent.capabilities]);

  const handleFieldSave = (field: string, value: string) => {
    onUpdateAgent?.(agent.id, { [field]: value });
  };

  const toggleCapability = (cap: string) => {
    setEnabledCapabilities((prev) => {
      const next = prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap];
      setCapsDirty(next.sort().join(",") !== [...agent.capabilities].sort().join(","));
      return next;
    });
  };

  const saveCapabilities = () => {
    if (capsDirty && enabledCapabilities.length > 0) {
      onUpdateAgent?.(agent.id, { capabilities: enabledCapabilities });
    }
  };

  const handleDeleteClick = (id: string) => {
    setRuleToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (ruleToDelete) {
      onRuleDelete(ruleToDelete);
      setRuleToDelete(null);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <AvatarUpload
              agentId={agent.id}
              avatarUrl={agent.avatarUrl}
              name={agent.name}
              runtimeId={agent.runtimeId}
              size="lg"
              onUploaded={onAgentUpdated}
            />
            <div className="flex-1">
              <InlineEditField
                value={agent.name}
                onSave={(val) => handleFieldSave("name", val)}
                className="text-xl font-bold text-foreground"
                inputClassName="text-xl font-bold"
                placeholder={m.agent_name()}
              />
              <div className="flex items-center gap-2 mt-1">
                <InlineEditField
                  value={agent.model}
                  onSave={(val) => handleFieldSave("model", val)}
                  className="rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                  inputClassName="text-[10px] font-mono"
                  mono
                  placeholder={m.agent_model_placeholder()}
                />
                <HugeiconsIcon
                  icon={Circle}
                  className={cn(
                    "size-2 fill-current",
                    agent.status === "active"
                      ? "text-emerald-500"
                      : agent.status === "error"
                        ? "text-red-500"
                        : "text-muted-foreground",
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {statusLabelMap[agent.status] || agent.status}
                </span>
              </div>
              <InlineEditField
                value={agent.role}
                onSave={(val) => handleFieldSave("role", val)}
                className="text-sm text-muted-foreground mt-1"
                inputClassName="text-sm"
                placeholder={m.agent_role_placeholder()}
              />
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            {m.capabilities()}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {CAPABILITY_OPTIONS.map((cap) => {
              const colors = CAPABILITY_COLORS[cap.value];
              const isSelected = enabledCapabilities.includes(cap.value);
              return (
                <button
                  key={cap.value}
                  type="button"
                  onClick={() => toggleCapability(cap.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    isSelected
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    <HugeiconsIcon icon={Wrench01Icon} className="size-3" />
                    {capLabelMap[cap.value] || cap.value.replace(/_/g, " ")}
                  </span>
                </button>
              );
            })}
          </div>
          {capsDirty && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={saveCapabilities}
                disabled={enabledCapabilities.length === 0}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  enabledCapabilities.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
                {m.save()}
              </button>
              <button
                onClick={() => {
                  setEnabledCapabilities(agent.capabilities);
                  setCapsDirty(false);
                }}
                className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                {m.cancel()}
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            {m.automation_rules()}
          </h2>
          <div className="space-y-1.5">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  rule.enabled
                    ? "border-border/50 bg-card"
                    : "border-border/30 bg-muted/20 opacity-60",
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
                  onClick={() => onRuleToggle(rule.id, !rule.enabled)}
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
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title={m.delete()}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 py-8 text-center">
                <HugeiconsIcon
                  icon={Shield01Icon}
                  className="mx-auto size-6 text-muted-foreground/30 mb-2"
                />
                <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{m.create_rules_desc()}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete_rule_confirm()}
        description={m.delete_rule_confirm()}
        onConfirm={handleDeleteConfirm}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </main>
  );
}
