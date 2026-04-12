import { useState, useEffect } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Cancel01Icon, Settings02Icon, SlidersHorizontalIcon, Robot02Icon, InformationCircleIcon, LinkCircleIcon, NotificationIcon } from "@hugeicons/core-free-icons"
import { cn } from "#/lib/utils"
import ThemeToggle from "#/components/layout/ThemeToggle"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "#/components/ui/select"
import { useLocale } from "#/lib/useI18n"
import { AVAILABLE_LOCALES } from "#/lib/i18n"
import { m } from "#/paraglide/messages"
import type { ControlSettings, AgentProfile, NotificationEvent } from "#/lib/types"
import { NOTIFICATION_EVENTS } from "#/lib/types"
import { api } from "#/lib/api"

type SettingsTab = "general" | "notifications" | "integrations" | "agents" | "about"

const tabDefs: { id: SettingsTab; icon: IconSvgElement; label: string }[] = [
  { id: "general", icon: SlidersHorizontalIcon, label: "General" },
  { id: "notifications", icon: NotificationIcon, label: "Notifications" },
  { id: "integrations", icon: LinkCircleIcon, label: "Integrations" },
  { id: "agents", icon: Robot02Icon, label: "Agents" },
  { id: "about", icon: InformationCircleIcon, label: "About" },
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
  const { locale, setLocaleWithSync } = useLocale()

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

  const handleLocaleChange = async (value: string) => {
    if (!currentSettings) return
    setLocaleWithSync(value)
    const updated = await api.updateSettings({ locale: value })
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  const handleNotificationToggle = async (key: "system" | "sound") => {
    if (!currentSettings) return
    const updated = await api.updateSettings({
      notifications: { ...currentSettings.notifications, [key]: !currentSettings.notifications[key] },
    })
    setLocalSettings(updated)
    onSettingsChange(updated)
  }

  const handleEventSoundToggle = async (event: NotificationEvent) => {
    if (!currentSettings) return
    const updated = await api.updateSettings({
      notifications: {
        ...currentSettings.notifications,
        eventSounds: {
          ...currentSettings.notifications.eventSounds,
          [event]: !currentSettings.notifications.eventSounds[event],
        },
      },
    })
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
            <span className="text-sm font-semibold text-foreground">{m.settings()}</span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-1">
            {tabDefs.map((tab) => {
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
              {tabDefs.find((t) => t.id === activeTab)?.label}
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
                    <span className="text-sm font-medium text-foreground">{m.auto_commit()}</span>
                    <p className="text-xs text-muted-foreground">{m.auto_commit_desc()}</p>
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
                    <span className="text-sm font-medium text-foreground">{m.auto_fix()}</span>
                    <p className="text-xs text-muted-foreground">{m.auto_fix_desc()}</p>
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

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">{m.language()}</span>
                    <p className="text-xs text-muted-foreground">{m.language_desc()}</p>
                  </div>
                  <Select
                    value={currentSettings.locale}
                    onValueChange={handleLocaleChange}
                  >
                    <SelectTrigger className="w-[160px]">
                      <span className="flex-1 text-start truncate">
                        {AVAILABLE_LOCALES.find((l) => l.value === currentSettings.locale)?.label ?? currentSettings.locale}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {AVAILABLE_LOCALES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                {/* System Notifications */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">System Notifications</span>
                    <p className="text-xs text-muted-foreground">Show desktop notifications for events</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle("system")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      currentSettings.notifications?.system ? "bg-emerald-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        currentSettings.notifications?.system ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Notification Sound */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">Notification Sound</span>
                    <p className="text-xs text-muted-foreground">Play a sound when notifications arrive</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle("sound")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      currentSettings.notifications?.sound ? "bg-emerald-500" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        currentSettings.notifications?.sound ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Per-Event Sound Config */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Event Sounds</span>
                  <p className="text-xs text-muted-foreground">Configure sound for individual events</p>
                  <div className="space-y-1.5 pt-1">
                    {NOTIFICATION_EVENTS.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5"
                      >
                        <span className="text-sm text-foreground">{event.label}</span>
                        <button
                          onClick={() => handleEventSoundToggle(event.id)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                            currentSettings.notifications?.eventSounds?.[event.id] !== false
                              ? "bg-emerald-500"
                              : "bg-muted"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                              currentSettings.notifications?.eventSounds?.[event.id] !== false
                                ? "translate-x-5"
                                : "translate-x-0.5"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "integrations" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {m.connect_services_desc()}
                </p>
                <div className="space-y-2">
                  {[
                    { name: "GitHub", description: "Pull requests, issues, and code reviews", connected: true },
                    { name: "Slack", description: "Notifications and mentions", connected: false },
                    { name: "Linear", description: "Issue tracking and project management", connected: false },
                    { name: "Sentry", description: "Error monitoring and alerts", connected: false },
                  ].map((integration) => (
                    <div
                      key={integration.name}
                      className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3"
                    >
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                        {integration.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground">{integration.name}</span>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                      <button
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          integration.connected
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {integration.connected ? m.connected() : m.connect()}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "agents" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  {m.configure_agents_desc()}
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
                    <span className="text-muted-foreground">{m.runtime()}</span>
                    <span className="font-medium text-foreground">Bun</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.server()}</span>
                    <span className="font-medium text-foreground">Elysia</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.ui()}</span>
                    <span className="font-medium text-foreground">React + Tailwind</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.database()}</span>
                    <span className="font-medium text-foreground">SQLite (Drizzle)</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {m.orchos_desc()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
