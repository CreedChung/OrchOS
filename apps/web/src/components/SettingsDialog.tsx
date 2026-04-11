import { useState, useEffect } from "react"
import { X, RotateCcw, Square, CheckCircle } from "lucide-react"
import { cn } from "#/lib/utils"
import type { ControlSettings } from "#/lib/types"
import { api } from "#/lib/api"

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  settings: ControlSettings | null
  onSettingsChange: (settings: ControlSettings) => void
}

export function SettingsDialog({ open, onClose, settings, onSettingsChange }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<ControlSettings | null>(settings)
  const [toolsStatus, setToolsStatus] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // Use settings from props when localSettings is null
  const currentSettings = localSettings ?? settings

  if (!open) return null

  const handleToggle = async (key: keyof Pick<ControlSettings, "autoCommit" | "autoFix">) => {
    if (!currentSettings) return
    const updated = await api.updateSettings({ [key]: !currentSettings[key] })
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  const handleStrategyChange = async (strategy: ControlSettings["modelStrategy"]) => {
    if (!currentSettings) return
    const updated = await api.updateSettings({ modelStrategy: strategy })
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  // Show loading state if no settings available
  if (!currentSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {currentSettings && (
          <div className="space-y-5">
            {/* Auto Commit */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">Auto Commit</span>
                <p className="text-xs text-muted-foreground">Automatically commit changes after actions</p>
              </div>
              <button
                onClick={() => handleToggle("autoCommit")}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  currentSettings.autoCommit ? "bg-emerald-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    currentSettings.autoCommit ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Auto Fix */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">Auto Fix</span>
                <p className="text-xs text-muted-foreground">Automatically attempt fixes on failures</p>
              </div>
              <button
                onClick={() => handleToggle("autoFix")}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  currentSettings.autoFix ? "bg-emerald-500" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    currentSettings.autoFix ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Model Strategy */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Model Strategy</span>
              <div className="flex gap-2">
                {(["local-first", "cloud-first", "adaptive"] as const).map((strategy) => (
                  <button
                    key={strategy}
                    onClick={() => handleStrategyChange(strategy)}
                    className={cn(
                      "rounded-md px-3 py-2 text-xs font-medium transition-colors",
                      currentSettings.modelStrategy === strategy
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-accent"
                    )}
                  >
                    {strategy === "local-first" && "Local First"}
                    {strategy === "cloud-first" && "Cloud First"}
                    {strategy === "adaptive" && "Adaptive"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Local: Use local models (Codex, Claude Code). Cloud: Use API models. Adaptive: Let system decide.
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <span className="mb-2 block text-sm font-medium text-foreground">System Info</span>
              <p className="text-xs text-muted-foreground">
                OrchOS v1.0 | Powered by Bun + Elysia + React
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
