import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudIcon, Server, CheckmarkCircle02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { AgentProfile, RuntimeProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { api, type SkillProfile } from "@/lib/api";
import { CAPABILITY_COLORS, getCapabilityOptions } from "@/components/agents/capability-options";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface EditAgentDialogProps {
  open: boolean;
  onClose: () => void;
  agent: AgentProfile;
  runtimes: RuntimeProfile[];
  skills: SkillProfile[];
  onSubmit: (id: string, data: Partial<{
    name: string;
    role: string;
    capabilities: string[];
    model: string;
    runtimeId: string;
    enabled: boolean;
  }>) => Promise<void>;
}

function getRuntimeDisplayKind(runtime: RuntimeProfile): "local" | "cloud" {
  return runtime.transport === "stdio" ? "local" : "cloud";
}

export function EditAgentDialog({ open, onClose, agent, runtimes, skills, onSubmit }: EditAgentDialogProps) {
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role);
  const [runtimeId, setRuntimeId] = useState<string | null>(agent.runtimeId || null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>(agent.capabilities);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(agent.model);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedRuntime = runtimes.find((r) => r.id === runtimeId);
  const selectedRuntimeDisplayKind = selectedRuntime ? getRuntimeDisplayKind(selectedRuntime) : null;
  const isAmpRuntime = selectedRuntime?.registryId === "amp" || selectedRuntime?.command === "amp";
  const { builtinOptions, marketOptions } = getCapabilityOptions(skills);

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
    const fallbackModel = selectedRuntime.currentModel || "";
    const initialModels = [agent.model, fallbackModel].filter(
      (model, index, models): model is string => Boolean(model) && models.indexOf(model) === index,
    );

    setLoadingModels(true);
    setAvailableModels(initialModels);
    setSelectedModel((current) => current || agent.model || fallbackModel || "");

    void api
      .listRuntimeModels(selectedRuntime.id)
      .then((result) => {
        if (cancelled) return;

        const runtimeModels = result.models.length > 0 ? result.models : initialModels;
        const models = [agent.model, ...runtimeModels].filter(
          (model, index, entries): model is string =>
            Boolean(model) && entries.indexOf(model) === index,
        );
        const nextSelected =
          (agent.model && models.includes(agent.model) && agent.model) ||
          (result.currentModel && models.includes(result.currentModel) && result.currentModel) ||
          (fallbackModel && models.includes(fallbackModel) && fallbackModel) ||
          models[0] ||
          "";

        setAvailableModels(models);
        setSelectedModel(nextSelected);
      })
      .catch(() => {
        if (cancelled) return;

        setAvailableModels(initialModels);
        setSelectedModel(agent.model || fallbackModel || "");
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingModels(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRuntime, agent.model]);

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
              <Spinner size="sm" />
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
                      {selectedRuntimeDisplayKind === "local" ? (
                        <HugeiconsIcon
                          icon={Server}
                          className="size-3.5 text-blue-500 dark:text-blue-400"
                        />
                      ) : selectedRuntimeDisplayKind === "cloud" ? (
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
                    const displayKind = getRuntimeDisplayKind(rt);
                    return (
                      <SelectItem key={rt.id} value={rt.id}>
                        <span className="flex items-center gap-2">
                          {displayKind === "local" ? (
                            <HugeiconsIcon
                              icon={Server}
                              className="size-3.5 text-blue-500 dark:text-blue-400"
                            />
                          ) : displayKind === "cloud" ? (
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
          <label className="text-xs font-medium text-muted-foreground">
            {isAmpRuntime ? "Mode" : m.agent_model()}
          </label>
          <Select
            value={selectedModel}
            onValueChange={(value) => setSelectedModel(value ?? "")}
            disabled={!selectedRuntime || loadingModels || availableModels.length === 0}
          >
            <SelectTrigger className="w-full">
              {loadingModels ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size="sm" name="helix" />
                  {isAmpRuntime ? "Modes..." : "Models..."}
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
            {builtinOptions.map((cap) => {
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
            {marketOptions.map((cap) => {
              const isSelected = selectedCapabilities.includes(cap.value);
              return (
                <button
                  key={cap.value}
                  type="button"
                  onClick={() => toggleCapability(cap.value)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    isSelected
                      ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                      : "border-border/50 bg-background text-muted-foreground hover:bg-muted/50 hover:border-border",
                  )}
                  title={m.skills()}
                >
                  {cap.label}
                </button>
              );
            })}
          </div>
          {marketOptions.length > 0 && (
            <p className="text-[10px] text-muted-foreground/60">
              {`Available from market: ${marketOptions.map((cap) => cap.label).join(", ")}`}
            </p>
          )}
        </div>
      </form>
    </AppDialog>
  );
}
