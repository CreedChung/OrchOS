import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudIcon, Loading01Icon, Server, CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AgentProfile, RuntimeProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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

interface EditAgentDialogProps {
  open: boolean;
  onClose: () => void;
  agent: AgentProfile;
  runtimes: RuntimeProfile[];
  onSubmit: (id: string, data: Partial<{
    name: string;
    role: string;
    capabilities: string[];
    model: string;
    runtimeId: string;
    enabled: boolean;
  }>) => Promise<void>;
}

export function EditAgentDialog({ open, onClose, agent, runtimes, onSubmit }: EditAgentDialogProps) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [runtimeId, setRuntimeId] = useState<string | null>(agent.runtimeId || null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(agent.capabilities);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(agent.model);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRuntime = runtimes.find((r) => r.id === runtimeId);

  useEffect(() => {
    setName(agent.name);
    setRole(agent.role);
    setRuntimeId(agent.runtimeId || null);
    setSelectedCapabilities([...agent.capabilities]);
    setSelectedModel(agent.model);
  }, [agent]);

  useEffect(() => {
    if (!selectedRuntime) {
      setLoadingModels(false);
      setAvailableModels([]);
      return;
    }

    let cancelled = false;
    const fallbackModel = selectedRuntime.currentModel || selectedRuntime.model;

    setLoadingModels(true);
    setAvailableModels(fallbackModel ? [fallbackModel] : []);

    void api
      .listRuntimeModels(selectedRuntime.id)
      .then((result) => {
        if (cancelled) return;

        const models =
          result.models.length > 0 ? result.models : fallbackModel ? [fallbackModel] : [];

        setAvailableModels(models);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableModels(fallbackModel ? [fallbackModel] : []);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingModels(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRuntime]);

  if (!open) return null;

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || selectedCapabilities.length === 0) return;

    setSaving(true);
    try {
      await onSubmit(agent.id, {
        name: name.trim(),
        role: role.trim(),
        capabilities: selectedCapabilities,
        model: selectedModel,
        runtimeId: runtimeId ?? undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={`${m.edit()} ${agent.name}`}
      size="md"
      bodyClassName="pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            {m.cancel()}
          </Button>
          <Button
            size="sm"
            type="submit"
            form="edit-agent-form"
            disabled={saving || !name.trim() || !role.trim() || selectedCapabilities.length === 0}
          >
            {saving ? (
              <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
            ) : (
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" />
            )}
            {m.save()}
          </Button>
        </>
      }
    >
      <form id="edit-agent-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{m.agent_name()}</label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={m.agent_name_placeholder()}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{m.agent_role()}</label>
          <Input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={m.agent_role_placeholder()}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{m.agent_runtime()}</label>
          {runtimes.length > 0 ? (
            <Select
              value={runtimeId ?? ""}
              onValueChange={(value) => setRuntimeId(value || null)}
            >
              <SelectTrigger>
                <span className="flex items-center gap-1.5 flex-1 text-start truncate">
                  {selectedRuntime ? (
                    <>
                      {selectedRuntime.model.startsWith("local/") ? (
                        <HugeiconsIcon
                          icon={Server}
                          className="size-3.5 text-blue-500 dark:text-blue-400"
                        />
                      ) : selectedRuntime.model.startsWith("cloud/") ? (
                        <HugeiconsIcon
                          icon={CloudIcon}
                          className="size-3.5 text-violet-500 dark:text-violet-400"
                        />
                      ) : null}
                      <span>{selectedRuntime.name}</span>
                    </>
                  ) : (
                    m.agent_runtime_placeholder()
                  )}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {runtimes.map((rt) => {
                    const isLocal = rt.model.startsWith("local/");
                    const isCloud = rt.model.startsWith("cloud/");
                    return (
                      <SelectItem key={rt.id} value={rt.id}>
                        <span className="flex items-center gap-2">
                          {isLocal ? (
                            <HugeiconsIcon
                              icon={Server}
                              className="size-3.5 text-blue-500 dark:text-blue-400"
                            />
                          ) : isCloud ? (
                            <HugeiconsIcon
                              icon={CloudIcon}
                              className="size-3.5 text-violet-500 dark:text-violet-400"
                            />
                          ) : null}
                          <span>{rt.name}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-md border border-dashed border-border/50 bg-muted/20 px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">{m.no_runtimes_registered()}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{m.agent_model()}</label>
          <Select
            value={selectedModel}
            onValueChange={(value) => setSelectedModel(value ?? "")}
            disabled={!selectedRuntime || loadingModels || availableModels.length === 0}
          >
            <SelectTrigger className="w-full">
              {loadingModels ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HugeiconsIcon icon={Loading01Icon} className="size-3.5 animate-spin" />
                  Models...
                </span>
              ) : (
                <SelectValue>
                  {selectedModel || m.agent_model_placeholder()}
                </SelectValue>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{m.agent_capabilities()}</label>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_OPTIONS.map((cap) => {
              const colors = CAPABILITY_COLORS[cap.value];
              const isSelected = selectedCapabilities.includes(cap.value);
              return (
                <button
                  key={cap.value}
                  type="button"
                  onClick={() => toggleCapability(cap.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    isSelected
                      ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                      : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:border-border",
                  )}
                >
                  {(m as Record<string, () => string>)[cap.labelKey]()}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </AppDialog>
  );
}