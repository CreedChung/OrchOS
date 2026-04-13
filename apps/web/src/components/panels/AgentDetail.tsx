import { useState } from "react"
import { cn } from "#/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Shield01Icon, ArrowRight01Icon, ToggleLeft, ToggleRight, Cancel01Icon, Circle, Wrench01Icon } from "@hugeicons/core-free-icons"
import { ConfirmDialog } from "#/components/ui/confirm-dialog"
import { m } from "#/paraglide/messages"
import type { AgentProfile, Rule } from "#/lib/types"

const statusLabelMap: Record<string, string> = {
  idle: m.status_idle(),
  active: m.status_active(),
  error: m.status_error(),
}

const capLabelMap: Record<string, string> = {
  write_code: m.cap_write_code(),
  fix_bug: m.cap_fix_bug(),
  run_tests: m.cap_run_tests(),
  commit: m.cap_commit(),
  review: m.cap_review(),
}

const conditionLabels: Record<string, string> = {
  test_failed: m.test_failed(),
  lint_error: m.lint_error(),
  lint_warning: m.lint_warning(),
  review_rejected: m.review_rejected(),
  build_failed: m.build_failed(),
  build_success: m.build_success(),
}

const actionLabels: Record<string, string> = {
  auto_fix: m.auto_fix_rule(),
  ignore: m.ignore_rule(),
  assign_reviewer: m.assign_reviewer(),
  archive: m.archive(),
  notify: m.notify(),
}

export function AgentDetailView({
  agent,
  rules,
  onRuleToggle,
  onRuleDelete,
}: {
  agent: AgentProfile
  rules: Rule[]
  onRuleToggle: (id: string, enabled: boolean) => void
  onRuleDelete: (id: string) => void
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)

  const handleDeleteClick = (id: string) => {
    setRuleToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (ruleToDelete) {
      onRuleDelete(ruleToDelete)
      setRuleToDelete(null)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
              {agent.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {agent.model}
                </span>
                <HugeiconsIcon
                  icon={Circle}
                  className={cn(
                    "size-2 fill-current",
                    agent.status === "active"
                      ? "text-emerald-500"
                      : agent.status === "error"
                        ? "text-red-500"
                        : "text-muted-foreground"
                  )}
                />
                <span className="text-xs text-muted-foreground">{statusLabelMap[agent.status] || agent.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{agent.role}</p>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="size-1.5 rounded-full bg-primary" />
            {m.capabilities()}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-accent/30 px-2.5 py-1 text-xs text-foreground"
              >
                <HugeiconsIcon icon={Wrench01Icon} className="size-3 text-primary/60" />
                {capLabelMap[cap] || cap.replace(/_/g, " ")}
              </span>
            ))}
          </div>
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
                    : "border-border/30 bg-muted/20 opacity-60"
                )}
              >
                <HugeiconsIcon icon={Shield01Icon} className={cn("size-4 shrink-0", rule.enabled ? "text-primary" : "text-muted-foreground")} />
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
                <HugeiconsIcon icon={Shield01Icon} className="mx-auto size-6 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {m.create_rules_desc()}
                </p>
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
  )
}
