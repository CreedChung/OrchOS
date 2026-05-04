import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  Settings02Icon,
  SlidersHorizontalIcon,
  Robot02Icon,
  InformationCircleIcon,
  LinkCircleIcon,
  NotificationIcon,
  Search01Icon,
  CloudIcon,
  Server,
  AddCircleHalfDotIcon,
  GitBranchIcon,
  BubbleChatIcon,
  FolderOpenIcon,
  AlertIcon,
  VolumeHighIcon,
  UnfoldMoreIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn, getRuntimeIcon } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Spinner } from "@/components/ui/spinner";
import { AppleSwitch } from "@/components/unlumen-ui/apple-switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/reminder";
import { AVAILABLE_LOCALES } from "@/lib/i18n";
import { playUiSound } from "@/lib/audio";
import { m } from "@/paraglide/messages";
import type { ControlSettings, NotificationEvent, SoundId } from "@/lib/types";
import { NOTIFICATION_EVENTS, AVAILABLE_SOUNDS } from "@/lib/types";
import { api, type DetectRuntimesResponse, type RuntimeProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";

type SettingsTab = "general" | "notifications" | "integrations" | "runtimes" | "about";

type IntegrationCategory = "code" | "comm" | "project" | "monitor";

const integrationCategoryDefs: {
  id: IntegrationCategory;
  icon: IconSvgElement;
  labelKey: () => string;
}[] = [
  { id: "code", icon: GitBranchIcon, labelKey: m.integration_cat_code },
  { id: "comm", icon: BubbleChatIcon, labelKey: m.integration_cat_comm },
  { id: "project", icon: FolderOpenIcon, labelKey: m.integration_cat_project },
  { id: "monitor", icon: AlertIcon, labelKey: m.integration_cat_monitor },
];

const integrationItems: {
  category: IntegrationCategory;
  nameKey: () => string;
  descKey: () => string;
  connected?: boolean;
}[] = [
  {
    category: "code",
    nameKey: m.integration_github,
    descKey: m.integration_github_desc,
    connected: true,
  },
  { category: "code", nameKey: m.integration_gitlab, descKey: m.integration_gitlab_desc },
  { category: "comm", nameKey: m.integration_slack, descKey: m.integration_slack_desc },
  { category: "comm", nameKey: m.integration_discord, descKey: m.integration_discord_desc },
  { category: "project", nameKey: m.integration_linear, descKey: m.integration_linear_desc },
  { category: "project", nameKey: m.integration_jira, descKey: m.integration_jira_desc },
  { category: "project", nameKey: m.integration_notion, descKey: m.integration_notion_desc },
  { category: "monitor", nameKey: m.integration_sentry, descKey: m.integration_sentry_desc },
  { category: "monitor", nameKey: m.integration_pagerduty, descKey: m.integration_pagerduty_desc },
];

const tabDefs: { id: SettingsTab; icon: IconSvgElement; labelKey: () => string }[] = [
  { id: "general", icon: SlidersHorizontalIcon, labelKey: m.general },
  { id: "notifications", icon: NotificationIcon, labelKey: m.notifications },
  { id: "integrations", icon: LinkCircleIcon, labelKey: m.integrations },
  { id: "runtimes", icon: Robot02Icon, labelKey: m.runtimes },
  { id: "about", icon: InformationCircleIcon, labelKey: m.about },
];

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: ControlSettings | null;
  onSettingsChange: (settings: ControlSettings) => void;
  onRuntimesRefresh: () => void;
  registeredRuntimes: RuntimeProfile[];
}

function ModelBadge({ model, isLocalRuntime }: { model: string; isLocalRuntime?: boolean }) {
  // Determine model provider type from the model string prefix
  const modelProvider = model.startsWith("cloud/")
    ? "cloud"
    : model.startsWith("local/")
      ? "local"
      : model.startsWith("http")
        ? "remote"
        : "local";
  // A locally installed CLI runtime that uses a cloud model is still a "local runtime"
  const showAsLocal = isLocalRuntime || modelProvider === "local";
  const label = showAsLocal ? m.model_local() : m.model_cloud();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        showAsLocal
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      )}
    >
      {showAsLocal ? (
        <HugeiconsIcon icon={Server} className="size-2.5" />
      ) : (
        <HugeiconsIcon icon={CloudIcon} className="size-2.5" />
      )}
      {label}
    </span>
  );
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
  onRuntimesRefresh,
  registeredRuntimes,
}: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<ControlSettings | null>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [activeIntegrationCat, setActiveIntegrationCat] = useState<IntegrationCategory>("code");
  const [detectResult, setDetectResult] = useState<DetectRuntimesResponse | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const { locale: currentLocale, setLocaleWithSync } = useLocale();

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const currentSettings = localSettings ?? settings;

  const handleToggle = async (
    key: keyof Pick<ControlSettings, "autoCommit" | "autoFix" | "projectChatsRequireSandbox">,
  ) => {
    if (!currentSettings) return;
    try {
      const updated = await api.updateSettings({ [key]: !currentSettings[key] });
      const merged = { ...currentSettings, ...updated };
      setLocalSettings(merged);
      onSettingsChange(merged);
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const handleLocaleChange = async (value: string) => {
    if (!currentSettings) return;
    setLocaleWithSync(value);
    try {
      const updated = await api.updateSettings({ locale: value });
      const merged = { ...currentSettings, ...updated };
      setLocalSettings(merged);
      onSettingsChange(merged);
    } catch (err) {
      console.error("Failed to update locale:", err);
    }
  };

  const handleNotificationToggle = async (key: "system" | "sound") => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        [key]: !currentSettings.notifications[key],
      },
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
    try {
      await api.updateSettings({ notifications: updated.notifications });
    } catch (err) {
      console.error("Failed to update notification settings:", err);
    }
  };

  const handleEventSoundToggle = async (event: NotificationEvent) => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        eventSounds: {
          ...currentSettings.notifications.eventSounds,
          [event]: !currentSettings.notifications.eventSounds[event],
        },
      },
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
    try {
      await api.updateSettings({ notifications: updated.notifications });
    } catch (err) {
      console.error("Failed to update event sound settings:", err);
    }
  };

  const handleEventSoundFileChange = async (event: NotificationEvent, soundId: SoundId) => {
    if (!currentSettings) return;
    const updated = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        eventSoundFiles: {
          ...currentSettings.notifications.eventSoundFiles,
          [event]: soundId,
        },
      },
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
    try {
      await api.updateSettings({ notifications: updated.notifications });
    } catch (err) {
      console.error("Failed to update event sound file settings:", err);
    }
  };

  const playSound = (soundId: SoundId) => {
    const sound = AVAILABLE_SOUNDS.find((s) => s.id === soundId);
    if (sound) {
      void playUiSound(sound.id, sound.file || undefined);
    }
  };

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    try {
      const result = await api.detectRuntimes();
      setDetectResult(result);
    } catch (err) {
      console.error("Detect failed:", err);
    } finally {
      setDetecting(false);
    }
  }, []);

  // Auto-detect runtimes whenever the runtimes tab is activated
  useEffect(() => {
    if (open && activeTab === "runtimes" && !detecting) {
      handleDetect();
    }
  }, [open, activeTab, handleDetect]);

  const handleRegisterAgent = useCallback(
    async (runtimeId: string) => {
      setRegistering(runtimeId);
      setRegisterMessage(null);
      try {
        const result = await api.registerDetectedRuntimes({ runtimeIds: [runtimeId] });
        onRuntimesRefresh();
        const detectResult = await api.detectRuntimes();
        setDetectResult(detectResult);

        if (result.registered.length > 0) {
          setRegisterMessage({
            type: "success",
            text: m.agent_registered({ name: result.registered[0].name }),
          });
        } else if (result.skipped.length > 0) {
          setRegisterMessage({
            type: "error",
            text: m.agent_already_registered({ name: result.skipped[0].name }),
          });
        }

        // Auto-clear message after 3s
        setTimeout(() => setRegisterMessage(null), 3000);
      } catch (err) {
        console.error("Register failed:", err);
        setRegisterMessage({ type: "error", text: m.agent_register_failed() });
        setTimeout(() => setRegisterMessage(null), 3000);
      } finally {
        setRegistering(null);
      }
    },
    [onRuntimesRefresh],
  );

  const handleRegisterAll = useCallback(async () => {
    setRegistering("__all__");
    setRegisterMessage(null);
    try {
      const result = await api.registerDetectedRuntimes({ registerAll: true });
      onRuntimesRefresh();
      const detectResult = await api.detectRuntimes();
      setDetectResult(detectResult);

      if (result.registered.length > 0) {
        setRegisterMessage({
          type: "success",
          text: m.agents_registered({ count: result.registered.length }),
        });
      } else {
        setRegisterMessage({ type: "error", text: m.agents_already_registered() });
      }

      // Auto-clear message after 3s
      setTimeout(() => setRegisterMessage(null), 3000);
    } catch (err) {
      console.error("Register all failed:", err);
      setRegisterMessage({ type: "error", text: m.agent_register_failed() });
      setTimeout(() => setRegisterMessage(null), 3000);
    } finally {
      setRegistering(null);
    }
  }, [onRuntimesRefresh]);

  if (!open) return null;

  if (!currentSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex h-[600px] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Left: Tabs */}
        <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
          <div className="flex h-12 items-center px-4">
            <HugeiconsIcon icon={Settings02Icon} className="mr-2 size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{m.settings()}</span>
          </div>
          <nav className="flex-1 space-y-0.5 px-2 py-1">
            {tabDefs.map((tab) => {
              const Icon = tab.icon;
              return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={cn(
                     "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                     activeTab === tab.id
                       ? "bg-accent text-accent-foreground"
                       : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                   )}
                 >
                  <HugeiconsIcon icon={Icon} className="size-4" />
                  {tab.labelKey()}
                </button>
              );
            })}
          </nav>
          <div className="flex justify-center border-t border-border p-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex h-12 items-center justify-between border-b border-border px-6">
            <h2 className="text-sm font-semibold text-foreground">
              {tabDefs.find((t) => t.id === activeTab)?.labelKey()}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
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
                  <AppleSwitch
                    checked={currentSettings.autoCommit}
                    onCheckedChange={() => void handleToggle("autoCommit")}
                    size="sm"
                    aria-label={m.auto_commit()}
                  />
                </div>

                {/* Auto Fix */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">{m.auto_fix()}</span>
                    <p className="text-xs text-muted-foreground">{m.auto_fix_desc()}</p>
                  </div>
                  <AppleSwitch
                    checked={currentSettings.autoFix}
                    onCheckedChange={() => void handleToggle("autoFix")}
                    size="sm"
                    aria-label={m.auto_fix()}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">Project Chats Require Sandbox</span>
                    <p className="text-xs text-muted-foreground">
                      When a chat is bound to a project, block execution unless that project's sandbox starts successfully.
                    </p>
                  </div>
                  <AppleSwitch
                    checked={currentSettings.projectChatsRequireSandbox}
                    onCheckedChange={() => void handleToggle("projectChatsRequireSandbox")}
                    size="sm"
                    aria-label="Project Chats Require Sandbox"
                  />
                </div>

                {/* Language */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">{m.language()}</span>
                    <p className="text-xs text-muted-foreground">{m.language_desc()}</p>
                  </div>
                  <Select
                    value={currentLocale}
                    onValueChange={(value) => value && void handleLocaleChange(value)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        {AVAILABLE_LOCALES.find((l) => l.value === currentLocale)?.label ||
                          AVAILABLE_LOCALES[0].label}
                      </SelectValue>
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
                    <span className="text-sm font-medium text-foreground">
                      {m.system_notifications()}
                    </span>
                    <p className="text-xs text-muted-foreground">{m.system_notifications_desc()}</p>
                  </div>
                  <AppleSwitch
                    checked={Boolean(currentSettings.notifications?.system)}
                    onCheckedChange={() => void handleNotificationToggle("system")}
                    size="sm"
                    aria-label={m.system_notifications()}
                  />
                </div>

                {/* Notification Sound */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {m.notification_sound()}
                    </span>
                    <p className="text-xs text-muted-foreground">{m.notification_sound_desc()}</p>
                  </div>
                  <AppleSwitch
                    checked={Boolean(currentSettings.notifications?.sound)}
                    onCheckedChange={() => void handleNotificationToggle("sound")}
                    size="sm"
                    aria-label={m.notification_sound()}
                  />
                </div>

                {/* Per-Event Sound Config */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">{m.event_sounds()}</span>
                  <p className="text-xs text-muted-foreground">{m.event_sounds_desc()}</p>
                  <div className="space-y-1.5 pt-1">
                    {NOTIFICATION_EVENTS.map((event) => {
                      const currentSoundId =
                        currentSettings.notifications?.eventSoundFiles?.[event.id] || "bell";
                      const isEnabled =
                        currentSettings.notifications?.eventSounds?.[event.id] !== false;
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-2.5"
                        >
                          <span className="text-sm text-foreground min-w-[120px]">
                            {m[event.labelKey]()}
                          </span>
                          <div className="flex items-center gap-2 flex-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                disabled={!isEnabled}
                                className={cn(
                                  "flex items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent h-7 px-2.5 text-xs min-w-[100px]",
                                  !isEnabled && "cursor-not-allowed opacity-50",
                                )}
                              >
                                <span className="truncate">
                                  {AVAILABLE_SOUNDS.find((s) => s.id === currentSoundId)?.name ||
                                    "Bell"}
                                </span>
                                <HugeiconsIcon
                                  icon={UnfoldMoreIcon}
                                  className="size-3 text-muted-foreground"
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-[140px] p-1">
                                {AVAILABLE_SOUNDS.map((sound) => (
                                  <div
                                    key={sound.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                                      sound.id === currentSoundId
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/50 cursor-pointer",
                                    )}
                                    onClick={(e) => {
                                      if ((e.target as HTMLElement).closest(".play-btn")) return;
                                      handleEventSoundFileChange(event.id, sound.id);
                                    }}
                                  >
                                    <button
                                      onClick={() => playSound(sound.id)}
                                      className="play-btn rounded p-0.5 hover:bg-muted transition-colors"
                                      type="button"
                                    >
                                      <HugeiconsIcon icon={VolumeHighIcon} className="size-3.5" />
                                    </button>
                                    <span className="flex-1 select-none">{sound.name}</span>
                                    {sound.id === currentSoundId && (
                                      <HugeiconsIcon
                                        icon={Tick02Icon}
                                        className="size-3 text-primary"
                                      />
                                    )}
                                  </div>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <AppleSwitch
                            checked={isEnabled}
                            onCheckedChange={() => void handleEventSoundToggle(event.id)}
                            size="sm"
                            aria-label={m[event.labelKey]()}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "integrations" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{m.connect_services_desc()}</p>
                <Tabs
                  value={activeIntegrationCat}
                  onValueChange={(v) => setActiveIntegrationCat(v as IntegrationCategory)}
                >
                  <TabsList className="max-w-full flex-wrap">
                    {integrationCategoryDefs.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <TabsTrigger key={cat.id} value={cat.id}>
                          <HugeiconsIcon icon={Icon} className="size-3.5" />
                          {cat.labelKey()}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
                {/* Filtered integration list */}
                <div className="space-y-2">
                  {integrationItems
                    .filter((item) => item.category === activeIntegrationCat)
                    .map((integration) => (
                      <div
                        key={integration.nameKey()}
                        className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3"
                      >
                        <div className="flex size-8 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                          {integration.nameKey().charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {integration.nameKey()}
                          </span>
                          <p className="text-xs text-muted-foreground">{integration.descKey()}</p>
                        </div>
                         <button
                           className={cn(
                             "rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                             integration.connected
                               ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                               : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                           )}
                         >
                          {integration.connected ? m.connected() : m.connect()}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === "runtimes" && (
              <div className="space-y-4">
                {/* Registration feedback */}
                {registerMessage && (
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs",
                      registerMessage.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
                    )}
                  >
                    {registerMessage.text}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground max-w-[240px]">{m.runtimes_desc()}</p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = "/dashboard/devices";
                      }}
                    >
                      本地设备
                    </Button>
                    {detectResult && detectResult.available.length > 0 && (
                      <button
                        onClick={handleRegisterAll}
                        disabled={registering === "__all__"}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                      >
                        {registering === "__all__" ? (
                          <span className="flex items-center gap-1">
                            <Spinner size="sm" />
                            {m.registering()}
                          </span>
                        ) : (
                          m.register_all()
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleDetect}
                      disabled={detecting}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {detecting ? (
                        <span className="flex items-center gap-1">
                          <Spinner size="sm" className="border-primary-foreground" />
                          {m.scanning()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Search01Icon} className="size-3" />
                          {m.detect_btn()}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Detected agents (available) */}
                {detectResult && detectResult.available.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {m.available()} ({detectResult.available.length})
                    </div>
                    {detectResult.available.map((agent) => {
                      const isRegistered = registeredRuntimes.some(
                        (r) => r.name === agent.name || r.registryId === agent.id,
                      );
                      return (
                        <div
                          key={agent.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-4 py-2.5",
                            isRegistered
                              ? "border-border/50 bg-muted/30"
                              : "border-emerald-500/20 bg-emerald-500/5",
                          )}
                        >
                          <div
                             className={cn(
                               "flex size-8 items-center justify-center rounded-md",
                               isRegistered
                                 ? "bg-muted/50 dark:bg-white/10"
                                 : "bg-muted/50 dark:bg-white/10",
                             )}
                           >
                             {(() => {
                               const iconUrl = getRuntimeIcon(agent);
                               return iconUrl ? (
                                 <img src={iconUrl} alt={agent.name} className="size-5 object-contain" />
                               ) : (
                                 <span
                                   className={cn(
                                     "text-sm font-bold",
                                     isRegistered
                                       ? "text-muted-foreground"
                                       : "text-emerald-600 dark:text-emerald-400",
                                   )}
                                 >
                                   {agent.name.charAt(0).toUpperCase()}
                                 </span>
                               );
                             })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {agent.name}
                              </span>
                              <ModelBadge model={agent.model} isLocalRuntime />
                              {agent.version && (
                                <span className="text-[10px] text-muted-foreground">
                                  v{agent.version}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{agent.role}</p>
                          </div>
                          {isRegistered ? (
                            <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {m.connected()}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRegisterAgent(agent.id)}
                              disabled={registering === agent.id}
                              className="rounded-md px-2.5 py-1 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                            >
                              {registering === agent.id ? (
<Spinner size="sm" />
                              ) : (
                                <span className="flex items-center gap-1">
                                  <HugeiconsIcon icon={AddCircleHalfDotIcon} className="size-3" />
                                  {m.register()}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Detected agents (unavailable) */}
                {detectResult && detectResult.unavailable.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                      {m.not_found()} ({detectResult.unavailable.length})
                    </div>
                    {detectResult.unavailable.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-3 rounded-lg border border-border/30 bg-muted/20 px-4 py-2.5 opacity-50"
                      >
                         <div className="flex size-8 items-center justify-center rounded-md bg-muted/50 dark:bg-white/10">
                            {(() => {
                               const iconUrl = getRuntimeIcon(agent);
                              return iconUrl ? (
                                <img src={iconUrl} alt={agent.name} className="size-5 object-contain opacity-50" />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground">
                                  {agent.name.charAt(0).toUpperCase()}
                                </span>
                              );
                            })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {agent.name}
                            </span>
                            <ModelBadge model={agent.model} isLocalRuntime />
                          </div>
                          <p className="text-xs text-muted-foreground">{agent.role}</p>
                        </div>
                        <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-muted text-muted-foreground">
                          {m.not_installed()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* No scan yet hint */}
                {!detectResult && !detecting && (
                  <div className="rounded-lg border border-dashed border-border/50 py-6 text-center">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="mx-auto size-5 text-muted-foreground/30 mb-2"
                    />
                    <p className="text-sm text-muted-foreground">{m.detect_runtimes_hint()}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {m.detect_runtimes_hint_desc()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.svg" alt="OrchOS" className="size-10" />
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
                    <span className="font-medium text-foreground">TanStack Start</span>
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
                <p className="text-[11px] text-muted-foreground">{m.orchos_desc()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
