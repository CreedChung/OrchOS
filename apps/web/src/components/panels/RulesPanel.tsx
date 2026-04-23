import { useMemo, useState } from "react";
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

  const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const agentNameById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.name])), [agents]);

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
      setRuleToDelete(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Shield01Icon} className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Rules</h2>
          <span className="text-xs text-muted-foreground">({rules.filter((r) => r.enabled).length} active)</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-3" />
          {m.new_rule()}
        </button>
      </div>

      {showCreate && (
        <div className="space-y-3 border-b border-border bg-accent/20 px-4 py-3">
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
              <textarea value={targetAgentIds} onChange={(e) => setTargetAgentIds(e.target.value)} placeholder="One agent id per line" className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
            </LabeledField>
            <LabeledField label="Path Patterns">
              <textarea value={pathPatterns} onChange={(e) => setPathPatterns(e.target.value)} placeholder="One glob/path fragment per line" className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring" />
            </LabeledField>
          </div>

          <LabeledField label="Task Types">
            <input
              type="text"
              value={taskTypes}
              onChange={(e) => setTaskTypes(e.target.value)}
              placeholder={taskTypeOptions.join(", ")}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
      )}

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {rules.map((rule) => (
            <div key={rule.id} className={cn("flex items-start gap-3 px-4 py-3 transition-colors", rule.enabled ? "bg-card" : "bg-muted/30 opacity-60")}>
              <HugeiconsIcon icon={Shield01Icon} className={cn("mt-0.5 size-4 shrink-0", rule.enabled ? "text-primary" : "text-muted-foreground")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{rule.name}</span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{rule.scope}</span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{rule.priority}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{conditionLabels[rule.condition] || rule.condition}</span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{actionLabels[rule.action] || rule.action}</span>
                  {rule.projectId ? <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium">{projectNameById.get(rule.projectId) || rule.projectId}</span> : null}
                </div>
                {rule.instruction ? <div className="mt-2 text-xs text-foreground/80 whitespace-pre-wrap">{rule.instruction}</div> : null}
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {rule.targetAgentIds.length > 0 ? <div>Agents: {rule.targetAgentIds.map((id) => agentNameById.get(id) || id).join(", ")}</div> : null}
                  {rule.pathPatterns.length > 0 ? <div>Paths: {rule.pathPatterns.join(", ")}</div> : null}
                  {rule.taskTypes.length > 0 ? <div>Task types: {rule.taskTypes.join(", ")}</div> : null}
                </div>
              </div>
              <button onClick={() => onToggleRule(rule.id, !rule.enabled)} className="shrink-0 text-muted-foreground hover:text-foreground" title={rule.enabled ? m.disable_rule() : m.enable_rule()}>
                {rule.enabled ? <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" /> : <HugeiconsIcon icon={ToggleLeft} className="size-5" />}
              </button>
              <button onClick={() => handleEditRule(rule)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit rule">
                <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
              </button>
              <button onClick={() => handleDeleteClick(rule.id)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title={m.delete()}>
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HugeiconsIcon icon={Shield01Icon} className="mb-2 size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{m.no_rules_yet()}</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Create structured rules for project, agent, path, and task-specific instruction matching.</p>
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
