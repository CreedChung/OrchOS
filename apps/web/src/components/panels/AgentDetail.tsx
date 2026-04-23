import { useState } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  ToggleLeft,
  ToggleRight,
  Cancel01Icon,
  Circle,
  Edit02Icon,
  Delete02Icon,
  UserIcon,
  CpuIcon,
  Settings02Icon,
  PlayIcon,
  PauseIcon,
} from "@hugeicons/core-free-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";
import type { AgentProfile, Rule } from "@/lib/types";

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

export function AgentDetailView({
  agent,
  rules,
  onRuleToggle,
  onRuleDelete,
  onAgentUpdated,
  onUpdateAgent,
  onDeleteAgent,
  onEditAgent,
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
  onDeleteAgent?: (id: string) => void;
  onEditAgent?: (id: string) => void;
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

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

  const handleToggleEnabled = () => {
    onUpdateAgent?.(agent.id, { enabled: !agent.enabled });
  };

  const statusColor = agent.status === "active"
    ? "text-emerald-500"
    : agent.status === "error"
      ? "text-red-500"
      : "text-muted-foreground";

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <AvatarUpload
              agentId={agent.id}
              avatarUrl={agent.avatarUrl}
              name={agent.name}
              runtimeId={agent.runtimeId}
              size="lg"
              onUploaded={onAgentUpdated}
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
                <Badge
                  variant={agent.enabled ? "default" : "outline"}
                  className={cn(
                    "text-[10px]",
                    agent.enabled
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "text-muted-foreground",
                  )}
                >
                  {agent.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Circle} className={cn("size-2 fill-current", statusColor)} />
                  <span>{statusLabelMap[agent.status] || agent.status}</span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={CpuIcon} className="size-3.5" />
                  <span className="font-mono text-xs">{agent.model}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <HugeiconsIcon icon={UserIcon} className="size-3.5 mt-0.5 shrink-0" />
                {agent.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleEnabled}
            >
              <HugeiconsIcon
                icon={agent.enabled ? PauseIcon : PlayIcon}
                className="size-3.5"
              />
              {agent.enabled ? "Disable" : "Enable"}
            </Button>
            {onEditAgent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditAgent(agent.id)}
              >
                <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                {m.edit()}
              </Button>
            )}
            {onDeleteAgent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeleteAgent(agent.id)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                {m.delete()}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Settings02Icon} className="size-4" />
            {m.capabilities()}
          </h2>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap) => {
              const colors = CAPABILITY_COLORS[cap] || {
                bg: "bg-muted/50",
                text: "text-muted-foreground",
                border: "border-border/50",
              };
              return (
                <div
                  key={cap}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium",
                    colors.bg,
                    colors.text,
                    colors.border,
                  )}
                >
                  {capLabelMap[cap] || cap.replace(/_/g, " ")}
                </div>
              );
            })}
            {agent.capabilities.length === 0 && (
              <p className="text-sm text-muted-foreground">No capabilities assigned</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} className="size-4" />
            {m.automation_rules()}
          </h2>
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  rule.enabled
                    ? "border-border/50 bg-card hover:bg-muted/30"
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
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {conditionLabels[rule.condition] || rule.condition}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {actionLabels[rule.action] || rule.action}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {rule.scope}
                    </span>
                  </div>
                  {rule.instruction ? (
                    <div className="mt-2 text-xs text-foreground/75 whitespace-pre-wrap">{rule.instruction}</div>
                  ) : null}
                </div>
                <button
                  onClick={() => onRuleToggle(rule.id, !rule.enabled)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
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
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  title={m.delete()}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                </button>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 py-10 text-center">
                <HugeiconsIcon
                  icon={Shield01Icon}
                  className="mx-auto size-8 text-muted-foreground/30 mb-3"
                />
                <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{m.create_rules_desc()}</p>
              </div>
            )}
          </div>
        </div>
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
