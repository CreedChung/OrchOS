import { useState, useEffect } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Cancel01Icon, Settings02Icon, Robot02Icon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { cn } from "#/lib/utils"
import ThemeToggle from "#/components/layout/ThemeToggle"
import type { ControlSettings, AgentProfile } from "#/lib/types"
import { api } from "#/lib/api"

type SettingsTab = "general" | "agents" | "about"

const tabs: { id: SettingsTab; label: string; icon: IconSvgElement }[] = [
  { id: "general", label: "General", icon: Settings02Icon },
  { id: "agents", label: "Agents", icon: Robot02Icon },
  { id: "about", label: "About", icon: InformationCircleIcon },
]

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  settings: ControlSettings | null
  onSettingsChange: (settings: ControlSettings) => void
  agents: AgentProfile[]
  onAgentToggle: (id: string, enabled: boolean) => void
}

export function SettingsDialog({ open, onClose, settings, onSettingsChange, agents, onAgentToggle }: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<ControlSettings | null>(settings)
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const currentSettings = localSettings ?? settings

  if (!open) return null

  const handleToggle = async (key: keyof Pick<ControlSettings, "autoCommit" | "autoFix">) => {
    if (!currentSettings) return
    const updated = await api.updateSettings({ [key]: !currentSettings[key] })
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  if (!currentSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[480px] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Left: Tabs */}
        <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
          <div className="flex h-12 items-center px-4">
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Settings</span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <HugeiconsIcon icon={Icon} className="size-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
          <div className="border-t border-border p-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex h-12 items-center justify-between border-b border-border px-6">
            <h2 className="text-sm font-semibold text-foreground">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Auto Commit */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">Auto Commit</span>
                    <p className="text-xs text-muted-foreground">Automatically commit changes after actions</p>
                  </div>
                  <button
                    onClick={() => handleToggle("autoCommit")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
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
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">Auto Fix</span>
                    <p className="text-xs text-muted-foreground">Automatically attempt fixes on failures</p>
                  </div>
                  <button
                    onClick={() => handleToggle("autoFix")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
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
              </div>
            )}

            {activeTab === "agents" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Configure which agents are available for task execution.
                </p>
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                      agent.enabled ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"
                    )}
                  >
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-md text-sm font-bold",
                      agent.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{agent.name}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {agent.model}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                    <button
                      onClick={() => onAgentToggle(agent.id, !agent.enabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                        agent.enabled ? "bg-emerald-500" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          agent.enabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <HugeiconsIcon icon={Settings02Icon} className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">OrchOS</p>
                    <p className="text-xs text-muted-foreground">v1.0.0</p>
                  </div>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Runtime</span>
                    <span className="font-medium text-foreground">Bun</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Server</span>
                    <span className="font-medium text-foreground">Elysia</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">UI</span>
                    <span className="font-medium text-foreground">React + Tailwind</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Database</span>
                    <span className="font-medium text-foreground">SQLite (Drizzle)</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  An AI-powered orchestration system for managing goals, agents, and workflows.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
