import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CloudIcon, Loading01Icon, Server } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { RuntimeProfile } from "@/lib/types";
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

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  runtimes: RuntimeProfile[];
  onSubmit: (data: {
    name: string;
    role: string;
    capabilities: string[];
    model: string;
    cliCommand?: string;
    runtimeId?: string;
  }) => void;
}

export function CreateAgentDialog({ open, onClose, runtimes, onSubmit }: CreateAgentDialogProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [runtimeId, setRuntimeId] = useState<string | null>(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  const selectedRuntime = runtimes.find((r) => r.id === runtimeId);

  const handleRuntimeChange = (id: string) => {
    setRuntimeId(id);
    const rt = runtimes.find((r) => r.id === id);
    if (rt) {
      setSelectedCapabilities([...rt.capabilities]);
    }
  };

  useEffect(() => {
    if (!selectedRuntime) {
      setLoadingModels(false);
      setAvailableModels([]);
      setSelectedModel("");
      return;
    }

    let cancelled = false;
    const fallbackModel = selectedRuntime.currentModel || selectedRuntime.model;

    setLoadingModels(true);
    setAvailableModels(fallbackModel ? [fallbackModel] : []);
    setSelectedModel(fallbackModel || "");

    void api
      .listRuntimeModels(selectedRuntime.id)
      .then((result) => {
        if (cancelled) return;

        const models = result.models.length > 0 ? result.models : fallbackModel ? [fallbackModel] : [];
        const nextSelected =
          (result.currentModel && models.includes(result.currentModel) && result.currentModel) ||
          (fallbackModel && models.includes(fallbackModel) && fallbackModel) ||
          models[0] ||
          "";

        setAvailableModels(models);
        setSelectedModel(nextSelected);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableModels(fallbackModel ? [fallbackModel] : []);
        setSelectedModel(fallbackModel || "");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !selectedRuntime || !selectedModel || selectedCapabilities.length === 0) return;
    onSubmit({
      name: name.trim(),
      role: role.trim(),
      capabilities: selectedCapabilities,
      model: selectedModel,
      cliCommand: selectedRuntime?.command,
      runtimeId: runtimeId ?? undefined,
    });
    setName("");
    setRole("");
    setRuntimeId(null);
    setSelectedCapabilities([]);
    setAvailableModels([]);
    setSelectedModel("");
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={m.create_agent()}
      size="md"
      bodyClassName="pt-5"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button
            size="sm"
            type="submit"
            form="create-agent-form"
            disabled={
              !name.trim() ||
              !role.trim() ||
              !selectedRuntime ||
              !selectedModel ||
              selectedCapabilities.length === 0
            }
          >
            {m.create_agent()}
          </Button>
        </>
      }
    >
      <form id="create-agent-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">{m.agent_name()}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.agent_name_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{m.agent_role()}</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={m.agent_role_placeholder()}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{m.agent_runtime()}</label>
            {runtimes.length > 0 ? (
              <Select value={runtimeId ?? ""} onValueChange={(value) => handleRuntimeChange(value ?? "")}>
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
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {m.no_runtimes_registered_desc()}
                </p>
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground/60">{m.create_agent_hint()}</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{m.agent_capabilities()}</label>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map((cap) => {
                const colors = CAPABILITY_COLORS[cap.value];
                const isSelected = selectedCapabilities.includes(cap.value);
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
                    {(m as Record<string, () => string>)[cap.labelKey]()}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground/60">
              {selectedRuntime
                ? "Prefilled from the selected runtime. You can still adjust capabilities before creating the agent."
                : "Select a runtime to prefill recommended capabilities, then adjust them if needed."}
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{m.agent_model()}</label>
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
                    {selectedModel || (!selectedRuntime ? m.agent_runtime_placeholder() : m.agent_model_placeholder())}
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
            {!loadingModels && selectedRuntime && availableModels.length === 0 && (
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                No models reported by runtime.
              </p>
            )}
          </div>
      </form>
    </AppDialog>
  );
}
