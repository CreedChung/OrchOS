import { useEffect, useMemo, useState } from "react";
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
  Edit02Icon,
  Delete02Icon,
  ToggleLeft,
  ToggleRight,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { m } from "@/paraglide/messages";
import type { AgentProfile, Project, Rule } from "@/lib/types";

interface RulesPanelProps {
  rules: Rule[];
  projects?: Project[];
  agents?: AgentProfile[];
  onCreateRule: (data: {
    name: string;
    condition: string;
    action: string;
    scope?: Rule["scope"];
    projectId?: string;
    targetAgentIds?: string[];
    pathPatterns?: string[];
    taskTypes?: string[];
    instruction?: string;
    priority?: Rule["priority"];
  }) => void;
  onUpdateRule?: (id: string, data: Partial<Rule>) => void;
  onToggleRule: (id: string, enabled: boolean) => void;
  onDeleteRule: (id: string) => void;
}

const conditionLabels: Record<string, string> = {
  always: "Always",
  test_failed: m.test_failed(),
  lint_error: m.lint_error(),
  lint_warning: m.lint_warning(),
  review_rejected: m.review_rejected(),
  build_failed: m.build_failed(),
  build_success: m.build_success(),
};

const actionLabels: Record<string, string> = {
  instruct: "Inject instruction",
  auto_fix: m.auto_fix_rule(),
  ignore: m.ignore_rule(),
  assign_reviewer: m.assign_reviewer(),
  archive: m.archive(),
  notify: m.notify(),
};

const taskTypeOptions = ["plan", "code", "review", "debug", "chat"] as const;

export function RulesPanel({ rules, projects = [], agents = [], onCreateRule, onUpdateRule, onToggleRule, onDeleteRule }: RulesPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState("always");
  const [action, setAction] = useState("instruct");
  const [scope, setScope] = useState<Rule["scope"]>("global");
  const [projectId, setProjectId] = useState("");
  const [targetAgentIds, setTargetAgentIds] = useState("");
  const [pathPatterns, setPathPatterns] = useState("");
  const [taskTypes, setTaskTypes] = useState("");
  const [instruction, setInstruction] = useState("");
  const [priority, setPriority] = useState<Rule["priority"]>("normal");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(288);

  const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const agentNameById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents]);
  const activeRule = rules.find((rule) => rule.id === activeRuleId) ?? null;

  useEffect(() => {
    if (rules.length === 0) {
      setActiveRuleId(null);
      return;
    }

    if (!rules.some((rule) => rule.id === activeRuleId)) {
      setActiveRuleId(rules[0].id);
    }
  }, [rules, activeRuleId]);

  const handleCreate = () => {
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      condition,
      action,
      scope,
      projectId: scope === "project" ? projectId || undefined : undefined,
      targetAgentIds: splitLines(targetAgentIds),
      pathPatterns: splitLines(pathPatterns),
      taskTypes: splitLines(taskTypes),
      instruction: instruction.trim(),
      priority,
    };

    if (editingRuleId && onUpdateRule) {
      onUpdateRule(editingRuleId, payload);
    } else {
      onCreateRule(payload);
    }

    setName("");
    setCondition("always");
    setAction("instruct");
    setScope("global");
    setProjectId("");
    setTargetAgentIds("");
    setPathPatterns("");
    setTaskTypes("");
    setInstruction("");
    setPriority("normal");
    setEditingRuleId(null);
    setShowCreate(false);
  };

  const handleEditRule = (rule: Rule) => {
    setActiveRuleId(rule.id);
    setEditingRuleId(rule.id);
    setShowCreate(true);
    setName(rule.name);
    setCondition(rule.condition);
    setAction(rule.action);
    setScope(rule.scope);
    setProjectId(rule.projectId || "");
    setTargetAgentIds(rule.targetAgentIds.join("\n"));
    setPathPatterns(rule.pathPatterns.join("\n"));
    setTaskTypes(rule.taskTypes.join(", "));
    setInstruction(rule.instruction);
    setPriority(rule.priority);
  };

  const handleDeleteClick = (id: string) => {
    setRuleToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (ruleToDelete) {
      onDeleteRule(ruleToDelete);
      if (activeRuleId === ruleToDelete) {
        setActiveRuleId(null);
      }
      setRuleToDelete(null);
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 288);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const openCreateForm = () => {
    setEditingRuleId(null);
    setShowCreate(true);
    setName("");
    setCondition("always");
    setAction("instruct");
    setScope("global");
    setProjectId("");
    setTargetAgentIds("");
    setPathPatterns("");
    setTaskTypes("");
    setInstruction("");
    setPriority("normal");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className="relative flex h-full shrink-0 flex-col border-r border-border bg-background"
        style={{ width: Math.min(sidebarWidth, 288), maxWidth: "18rem" }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Rules</h2>
            <span className="text-xs text-muted-foreground">({rules.filter((r) => r.enabled).length} active)</span>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {rules.map((rule) => {
              const isActive = rule.id === activeRuleId;
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => {
                    setActiveRuleId(rule.id);
                    setShowCreate(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-accent/50",
                    !rule.enabled && "opacity-60",
                  )}
                >
                  <HugeiconsIcon
                    icon={Shield01Icon}
                    className={cn("mt-0.5 size-4 shrink-0", rule.enabled ? "text-primary" : "text-muted-foreground")}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium">{rule.name}</p>
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          rule.enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
                        )}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {conditionLabels[rule.condition] || rule.condition} · {actionLabels[rule.action] || rule.action}
                    </p>
                  </div>
                </button>
              );
            })}
            {rules.length === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <HugeiconsIcon icon={Shield01Icon} className="mb-2 size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize rules list"
          onPointerDown={handleResizeStart}
          className="absolute top-0 right-[-4px] z-10 h-full w-2 cursor-col-resize rounded-full transition-colors hover:bg-primary/15"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              {showCreate ? (editingRuleId ? "Edit Rule" : "Create Rule") : activeRule?.name ?? "Rules"}
            </h2>
          </div>
          {!showCreate && activeRule ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onToggleRule(activeRule.id, !activeRule.enabled)} className="shrink-0 text-muted-foreground hover:text-foreground" title={activeRule.enabled ? m.disable_rule() : m.enable_rule()}>
                {activeRule.enabled ? <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" /> : <HugeiconsIcon icon={ToggleLeft} className="size-5" />}
              </button>
              <button onClick={() => handleEditRule(activeRule)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit rule">
                <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
              </button>
              <button onClick={() => handleDeleteClick(activeRule.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title={m.delete()}>
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3" />
              {m.new_rule()}
            </button>
          )}
        </div>

        {showCreate ? (
          <ScrollArea className="flex-1">
            <div className="space-y-3 bg-accent/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{editingRuleId ? "Edit Structured Rule" : "Create Structured Rule"}</span>
            <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
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

          <div className="grid gap-3 md:grid-cols-2">
            <LabeledField label="Scope">
              <Select value={scope} onValueChange={(value) => setScope((value as Rule["scope"]) || scope)}>
                <SelectTrigger><SelectValue>{scope}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">global</SelectItem>
                  <SelectItem value="project">project</SelectItem>
                </SelectContent>
              </Select>
            </LabeledField>

            <LabeledField label="Priority">
              <Select value={priority} onValueChange={(value) => setPriority((value as Rule["priority"]) || priority)}>
                <SelectTrigger><SelectValue>{priority}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="normal">normal</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </LabeledField>

            <LabeledField label="Condition">
              <Select value={condition} onValueChange={(value) => setCondition(value ?? condition)}>
                <SelectTrigger><SelectValue>{conditionLabels[condition] || condition}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(conditionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </LabeledField>

            <LabeledField label="Action">
              <Select value={action} onValueChange={(value) => setAction(value ?? action)}>
                <SelectTrigger><SelectValue>{actionLabels[action] || action}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(actionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </LabeledField>
          </div>

          {scope === "project" && (
            <LabeledField label="Project">
              <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue>{projectNameById.get(projectId) || "Select project"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabeledField>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <LabeledField label="Target Agent IDs">
              <div className="space-y-2 rounded-md border border-border bg-background px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {agents.map((agent) => {
                    const selectedIds = new Set(splitLines(targetAgentIds));
                    const selected = selectedIds.has(agent.id);
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedIds);
                          if (selected) next.delete(agent.id);
                          else next.add(agent.id);
                          setTargetAgentIds(Array.from(next).join("\n"));
                        }}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[10px] transition-colors",
                          selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {agent.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </LabeledField>
            <LabeledField label="Path Patterns">
              <textarea value={pathPatterns} onChange={(e) => setPathPatterns(e.target.value)} placeholder="One glob/path fragment per line" className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
            </LabeledField>
          </div>

          <LabeledField label="Task Types">
            <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background px-3 py-2">
              {taskTypeOptions.map((taskType) => {
                const selectedTypes = new Set(splitLines(taskTypes));
                const selected = selectedTypes.has(taskType);
                return (
                  <button
                    key={taskType}
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedTypes);
                      if (selected) next.delete(taskType);
                      else next.add(taskType);
                      setTaskTypes(Array.from(next).join(", "));
                    }}
                    className={cn(
                      "rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors",
                      selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {taskType}
                  </button>
                );
              })}
            </div>
          </LabeledField>

          <LabeledField label="Instruction">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Instruction to inject when this rule matches"
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </LabeledField>

          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              name.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            {editingRuleId ? "Save Rule" : m.create_rule()}
          </button>
            </div>
          </ScrollArea>
        ) : activeRule ? (
          <ScrollArea className="flex-1">
            <div className="space-y-6 px-4 py-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-foreground">{activeRule.name}</span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{activeRule.scope}</span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{activeRule.priority}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{conditionLabels[activeRule.condition] || activeRule.condition}</span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{actionLabels[activeRule.action] || activeRule.action}</span>
                  {activeRule.projectId ? <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{projectNameById.get(activeRule.projectId) || activeRule.projectId}</span> : null}
                </div>
                {activeRule.instruction ? <div className="mt-4 whitespace-pre-wrap text-sm text-foreground/80">{activeRule.instruction}</div> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <RuleMetaCard
                  title="Agents"
                  values={activeRule.targetAgentIds.map((id) => agentNameById.get(id) || id)}
                  emptyLabel="No agent targets"
                />
                <RuleMetaCard
                  title="Paths"
                  values={activeRule.pathPatterns}
                  emptyLabel="No path filters"
                />
                <RuleMetaCard
                  title="Task types"
                  values={activeRule.taskTypes}
                  emptyLabel="No task filters"
                />
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div>
              <HugeiconsIcon icon={Shield01Icon} className="mx-auto mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Create structured rules for project, agent, path, and task-specific instruction matching.</p>
            </div>
          </div>
        )}

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
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function RuleMetaCard({ title, values, emptyLabel }: { title: string; values: string[]; emptyLabel: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {values.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span key={value} className="rounded-full bg-accent px-2 py-1 text-xs text-foreground">
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
