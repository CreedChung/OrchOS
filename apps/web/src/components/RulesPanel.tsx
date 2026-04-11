import { useState } from "react"
import { cn } from "#/lib/utils"
import { ScrollArea } from "#/components/ui/scroll-area"
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, X, ArrowRight } from "lucide-react"
import type { Rule, Problem } from "#/lib/types"

interface RulesPanelProps {
  rules: Rule[]
  onCreateRule: (data: { name: string; condition: string; action: string }) => void
  onToggleRule: (id: string, enabled: boolean) => void
  onDeleteRule: (id: string) => void
}

const conditionLabels: Record<string, string> = {
  test_failed: "Test failed",
  lint_error: "Lint error",
  lint_warning: "Lint warning",
  review_rejected: "Review rejected",
  build_failed: "Build failed",
  build_success: "Build success",
}

const actionLabels: Record<string, string> = {
  auto_fix: "Auto fix",
  ignore: "Ignore",
  assign_reviewer: "Assign reviewer",
  archive: "Archive",
  notify: "Notify",
}

export function RulesPanel({ rules, onCreateRule, onToggleRule, onDeleteRule }: RulesPanelProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [condition, setCondition] = useState("test_failed")
  const [action, setAction] = useState("auto_fix")

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateRule({ name: name.trim(), condition, action })
    setName("")
    setCondition("test_failed")
    setAction("auto_fix")
    setShowCreate(false)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Automation Rules</h2>
          <span className="text-xs text-muted-foreground">({rules.filter((r) => r.enabled).length} active)</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-3" />
          New Rule
        </button>
      </div>

      {/* Create Rule Form */}
      {showCreate && (
        <div className="border-b border-border bg-accent/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Create Rule</span>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rule name (e.g. Auto-fix test failures)"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">When</span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(conditionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ArrowRight className="size-3 text-muted-foreground" />
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              name.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Create Rule
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
                rule.enabled ? "bg-card" : "bg-muted/30 opacity-60"
              )}
            >
              <Shield className={cn("size-4 shrink-0", rule.enabled ? "text-primary" : "text-muted-foreground")} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{rule.name}</span>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">
                    {conditionLabels[rule.condition] || rule.condition}
                  </span>
                  <ArrowRight className="size-2.5" />
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">
                    {actionLabels[rule.action] || rule.action}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onToggleRule(rule.id, !rule.enabled)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                title={rule.enabled ? "Disable rule" : "Enable rule"}
              >
                {rule.enabled ? (
                  <ToggleRight className="size-5 text-emerald-500" />
                ) : (
                  <ToggleLeft className="size-5" />
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this rule?")) onDeleteRule(rule.id)
                }}
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                title="Delete rule"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No rules yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Create rules to auto-handle problems
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
