import { useState } from "react";
import { cn } from "#/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChevronDown,
  ChevronRight,
  Settings02Icon,
  ToggleLeft,
  ToggleRight,
} from "@hugeicons/core-free-icons";
import { m } from "#/paraglide/messages";
import type { ControlSettings } from "#/lib/types";
import { api } from "#/lib/api";

interface ControlPanelProps {
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
}

export function ControlPanel({ settings, onSettingsChange }: ControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async (key: keyof Pick<ControlSettings, "autoCommit" | "autoFix">) => {
    if (!settings) return;
    const updated = await api.updateSettings({ [key]: !settings[key] });
    onSettingsChange(updated);
  };

  const handleStrategyChange = async (strategy: ControlSettings["modelStrategy"]) => {
    if (!settings) return;
    const updated = await api.updateSettings({ modelStrategy: strategy });
    onSettingsChange(updated);
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50"
      >
        <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
        <span className="flex-1 text-left">{m.control_panel()}</span>
        {expanded ? (
          <HugeiconsIcon icon={ChevronDown} className="size-3" />
        ) : (
          <HugeiconsIcon icon={ChevronRight} className="size-3" />
        )}
      </button>

      {expanded && settings && (
        <div className="space-y-3 border-t border-border px-6 py-4">
          {/* Auto Commit */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{m.auto_commit()}</span>
            <button
              onClick={() => handleToggle("autoCommit")}
              className="flex items-center gap-1.5 text-sm"
            >
              {settings.autoCommit ? (
                <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
              ) : (
                <HugeiconsIcon icon={ToggleLeft} className="size-5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-xs",
                  settings.autoCommit ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {settings.autoCommit ? m.on() : m.off()}
              </span>
            </button>
          </div>

          {/* Auto Fix */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">{m.auto_fix()}</span>
            <button
              onClick={() => handleToggle("autoFix")}
              className="flex items-center gap-1.5 text-sm"
            >
              {settings.autoFix ? (
                <HugeiconsIcon icon={ToggleRight} className="size-5 text-emerald-500" />
              ) : (
                <HugeiconsIcon icon={ToggleLeft} className="size-5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-xs",
                  settings.autoFix ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {settings.autoFix ? m.on() : m.off()}
              </span>
            </button>
          </div>

          {/* Model Strategy */}
          <div>
            <span className="mb-2 block text-sm text-foreground">{m.model_strategy()}</span>
            <div className="flex gap-1.5">
              {(["local-first", "cloud-first", "adaptive"] as const).map((strategy) => {
                const labelMap = {
                  "local-first": m.model_local(),
                  "cloud-first": m.model_cloud(),
                  adaptive: m.adaptive(),
                };
                return (
                  <button
                    key={strategy}
                    onClick={() => handleStrategyChange(strategy)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      settings.modelStrategy === strategy
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-accent",
                    )}
                  >
                    {labelMap[strategy]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
