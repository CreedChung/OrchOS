import { useState, useEffect, useCallback } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { toast } from "sonner";
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
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { cn, getRuntimeIcon } from "@/lib/utils";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/lib/useI18n";
import { AVAILABLE_LOCALES } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import type { ControlSettings, NotificationEvent } from "@/lib/types";
import { NOTIFICATION_EVENTS } from "@/lib/types";
import { api, type DetectRuntimesResponse, type RuntimeProfile } from "@/lib/api";

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
  onConversationsRefresh?: () => void | Promise<void>;
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
  const modelName = model.replace(/^(cloud|local)\//, "");
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
      {modelName && modelName !== model && <span className="opacity-60 ml-0.5">{modelName}</span>}
    </span>
  );
}

function RuntimeModeBadge({
  mode,
}: {
  mode: "acp-native" | "acp-adapter" | "cli-fallback";
}) {
  return (
    <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {mode === "acp-native" ? "ACP Native" : mode === "acp-adapter" ? "ACP Adapter" : "CLI Fallback"}
    </span>
  );
}

interface EditAcpDialogProps {
  runtime: RuntimeProfile | null;
  draft: {
    protocol: RuntimeProfile["protocol"];
    transport: RuntimeProfile["transport"];
    communicationMode: RuntimeProfile["communicationMode"];
    acpCommand: string;
    acpArgs: string;
    acpEnv: string;
  } | null;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (patch: Partial<NonNullable<EditAcpDialogProps["draft"]>>) => void;
  onSave: () => void;
}

function EditAcpDialog({ runtime, draft, saving, onClose, onDraftChange, onSave }: EditAcpDialogProps) {
  if (!runtime || !draft) return null;

  return (
    <AppDialog
      open={Boolean(runtime && draft)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Edit ACP"
      description={runtime.name}
      size="xl"
      nested
      bodyClassName="grid gap-3"
      footer={
        <>
          <Button size="sm" type="button" variant="outline" onClick={onClose}>
            {m.cancel()}
          </Button>
          <Button size="sm" type="button" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : m.save()}
          </Button>
        </>
      }
    >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Transport</span>
              <Select
                value={draft.transport}
                onValueChange={(value) => onDraftChange({ transport: value as RuntimeProfile["transport"] })}
              >
                <SelectTrigger>
                  <SelectValue>{draft.transport}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">stdio</SelectItem>
                  <SelectItem value="tcp">tcp</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Mode</span>
              <Select
                value={draft.communicationMode}
                onValueChange={(value) =>
                  onDraftChange({ communicationMode: value as RuntimeProfile["communicationMode"] })
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {draft.communicationMode === "acp-native"
                      ? "ACP Native"
                      : draft.communicationMode === "acp-adapter"
                        ? "ACP Adapter"
                        : "CLI Fallback"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acp-native">ACP Native</SelectItem>
                  <SelectItem value="acp-adapter">ACP Adapter</SelectItem>
                  <SelectItem value="cli-fallback">CLI Fallback</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">ACP Command</span>
            <input
              type="text"
              value={draft.acpCommand}
              onChange={(e) => onDraftChange({ acpCommand: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
              placeholder="npx"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">ACP Args (one per line)</span>
            <textarea
              value={draft.acpArgs}
              onChange={(e) => onDraftChange({ acpArgs: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
              placeholder={"-y\n@zed-industries/claude-code-acp"}
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">ACP Env (KEY=value per line)</span>
            <textarea
              value={draft.acpEnv}
              onChange={(e) => onDraftChange({ acpEnv: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
              placeholder={"DEBUG=true\nOPENAI_API_KEY=..."}
            />
          </label>
    </AppDialog>
  );
}

export function SettingsDialog({
  open,
  onClose,
  settings,
  onSettingsChange,
  onRuntimesRefresh,
  onConversationsRefresh,
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
  const [editingRuntimeId, setEditingRuntimeId] = useState<string | null>(null);
  const [savingRuntimeId, setSavingRuntimeId] = useState<string | null>(null);
  const [runtimeDrafts, setRuntimeDrafts] = useState<
    Record<
      string,
      {
        protocol: RuntimeProfile["protocol"];
        transport: RuntimeProfile["transport"];
        communicationMode: RuntimeProfile["communicationMode"];
        acpCommand: string;
        acpArgs: string;
        acpEnv: string;
      }
    >
  >({});
  const [deletedConversationCount, setDeletedConversationCount] = useState(0);
  const [clearingTrash, setClearingTrash] = useState(false);
  const { locale: currentLocale, setLocaleWithSync } = useLocale();

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!open) return;

    void api
      .listConversations()
      .then((conversations) => {
        setDeletedConversationCount(conversations.filter((conversation) => conversation.deleted).length);
      })
      .catch((err) => {
        console.error("Failed to load deleted conversations:", err);
      });
  }, [open]);

  const currentSettings = localSettings ?? settings;

  const handleToggle = async (key: keyof Pick<ControlSettings, "autoCommit" | "autoFix">) => {
    if (!currentSettings) return;
    const updated = await api.updateSettings({ [key]: !currentSettings[key] });
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleLocaleChange = async (value: string) => {
    if (!currentSettings) return;
    setLocaleWithSync(value);
    const updated = await api.updateSettings({ locale: value });
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleNotificationToggle = async (key: "system" | "sound") => {
    if (!currentSettings) return;
    const updated = await api.updateSettings({
      notifications: {
        ...currentSettings.notifications,
        [key]: !currentSettings.notifications[key],
      },
    });
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleEventSoundToggle = async (event: NotificationEvent) => {
    if (!currentSettings) return;
    const updated = await api.updateSettings({
      notifications: {
        ...currentSettings.notifications,
        eventSounds: {
          ...currentSettings.notifications.eventSounds,
          [event]: !currentSettings.notifications.eventSounds[event],
        },
      },
    });
    setLocalSettings(updated);
    onSettingsChange(updated);
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

  const getRuntimeDraft = useCallback(
    (runtime: RuntimeProfile) => {
      return (
        runtimeDrafts[runtime.id] || {
          protocol: runtime.protocol,
          transport: runtime.transport,
          communicationMode: runtime.communicationMode,
          acpCommand: runtime.acpCommand || "",
          acpArgs: runtime.acpArgs.join("\n"),
          acpEnv: Object.entries(runtime.acpEnv)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n"),
        }
      );
    },
    [runtimeDrafts],
  );

  const updateRuntimeDraft = useCallback(
    (runtimeId: string, patch: Partial<(typeof runtimeDrafts)[string]>) => {
      setRuntimeDrafts((prev) => ({
        ...prev,
        [runtimeId]: {
          ...prev[runtimeId],
          ...patch,
        },
      }));
    },
    [],
  );

  const handleOpenRuntimeEditor = useCallback(
    (runtime: RuntimeProfile) => {
      setEditingRuntimeId(runtime.id);
      setRuntimeDrafts((prev) => ({
        ...prev,
        [runtime.id]: getRuntimeDraft(runtime),
        [runtime.id]: {
          ...getRuntimeDraft(runtime),
          protocol: "acp",
        },
      }));
    },
    [getRuntimeDraft],
  );

  const editingRuntime = editingRuntimeId
    ? registeredRuntimes.find((runtime) => runtime.id === editingRuntimeId) ?? null
    : null;
  const editingDraft = editingRuntime ? getRuntimeDraft(editingRuntime) : null;

  const handleSaveRuntimeConfig = useCallback(
    async (runtime: RuntimeProfile) => {
      const draft = getRuntimeDraft(runtime);
      setSavingRuntimeId(runtime.id);

      try {
        const acpArgs = draft.acpArgs
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        const acpEnv = Object.fromEntries(
          draft.acpEnv
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const separatorIndex = line.indexOf("=");
              if (separatorIndex === -1) return [line, ""];
              return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()];
            })
            .filter(([key]) => key),
        );

        await api.updateRuntime(runtime.id, {
          protocol: "acp",
          transport: draft.transport,
          communicationMode: draft.communicationMode,
          acpCommand: draft.acpCommand.trim(),
          acpArgs,
          acpEnv,
        });

        await onRuntimesRefresh();
        setEditingRuntimeId(null);
        toast.success("Runtime configuration saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save runtime configuration");
      } finally {
        setSavingRuntimeId(null);
      }
    },
    [getRuntimeDraft, onRuntimesRefresh],
  );

  const handleClearTrash = useCallback(async () => {
    setClearingTrash(true);
    try {
      const result = await api.clearDeletedConversations();
      setDeletedConversationCount(0);
      await onConversationsRefresh?.();
      toast.success(
        result.count > 0 ? m.creation_trash_cleared({ count: result.count }) : m.creation_trash_empty(),
      );
    } catch (err) {
      console.error("Failed to clear trash:", err);
      toast.error(m.creation_trash_clear_failed());
    } finally {
      setClearingTrash(false);
    }
  }, []);

  if (!open) return null;

  if (!currentSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
                      currentSettings.autoCommit ? "bg-emerald-500" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        currentSettings.autoCommit ? "translate-x-6" : "translate-x-1",
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
                      currentSettings.autoFix ? "bg-emerald-500" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        currentSettings.autoFix ? "translate-x-6" : "translate-x-1",
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
                  <Select value={currentLocale} onValueChange={(value) => value && void handleLocaleChange(value)}>
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

                <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </div>
                    <div className="max-w-[320px]">
                      <span className="text-sm font-medium text-foreground">{m.creation_trash()}</span>
                      <p className="text-xs text-muted-foreground">
                        {m.creation_trash_desc({ count: deletedConversationCount })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleClearTrash()}
                    disabled={clearingTrash || deletedConversationCount === 0}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      clearingTrash || deletedConversationCount === 0
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20",
                    )}
                    type="button"
                  >
                    {clearingTrash ? m.clearing() : m.clear_trash()}
                  </button>
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
                  <button
                    onClick={() => handleNotificationToggle("system")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      currentSettings.notifications?.system ? "bg-emerald-500" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        currentSettings.notifications?.system ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>

                {/* Notification Sound */}
                <div className="flex items-center justify-between">
                  <div className="max-w-[280px]">
                    <span className="text-sm font-medium text-foreground">
                      {m.notification_sound()}
                    </span>
                    <p className="text-xs text-muted-foreground">{m.notification_sound_desc()}</p>
                  </div>
                  <button
                    onClick={() => handleNotificationToggle("sound")}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                      currentSettings.notifications?.sound ? "bg-emerald-500" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        currentSettings.notifications?.sound ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>

                {/* Per-Event Sound Config */}
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">{m.event_sounds()}</span>
                  <p className="text-xs text-muted-foreground">{m.event_sounds_desc()}</p>
                  <div className="space-y-1.5 pt-1">
                    {NOTIFICATION_EVENTS.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5"
                      >
                        <span className="text-sm text-foreground">{m[event.labelKey]()}</span>
                        <button
                          onClick={() => handleEventSoundToggle(event.id)}
                          className={cn(
                            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                            currentSettings.notifications?.eventSounds?.[event.id] !== false
                              ? "bg-emerald-500"
                              : "bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                              currentSettings.notifications?.eventSounds?.[event.id] !== false
                                ? "translate-x-5"
                                : "translate-x-0.5",
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
                            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
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
                    {detectResult && detectResult.available.length > 0 && (
                      <button
                        onClick={handleRegisterAll}
                        disabled={registering === "__all__"}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                      >
                        {registering === "__all__" ? (
                          <span className="flex items-center gap-1">
                            <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                          <span className="size-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
                                ? "bg-white dark:bg-white/10"
                                : "bg-white dark:bg-white/10",
                            )}
                          >
                            {getRuntimeIcon(agent) ? (
                              <img
                                src={getRuntimeIcon(agent)}
                                alt={agent.name}
                                className="size-5"
                              />
                            ) : (
                              <span className={cn(
                                "text-sm font-bold",
                                isRegistered
                                  ? "text-muted-foreground"
                                  : "text-emerald-600 dark:text-emerald-400",
                              )}>
                                {agent.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {agent.name}
                              </span>
                              <ModelBadge model={agent.model} isLocalRuntime />
                              <RuntimeModeBadge mode={agent.communicationMode} />
                              {agent.version && (
                                <span className="text-[10px] text-muted-foreground">
                                  v{agent.version}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{agent.role}</p>
                          </div>
                          {isRegistered ? (
                            <div className="flex items-center gap-2">
                              <span className="rounded-md px-2.5 py-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {m.connected()}
                              </span>
                              <button
                                onClick={() => {
                                  const runtime = registeredRuntimes.find(
                                    (r) => r.name === agent.name || r.registryId === agent.id,
                                  );
                                  if (runtime) {
                                    handleOpenRuntimeEditor(runtime);
                                  }
                                }}
                                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                                type="button"
                              >
                                Edit ACP
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleRegisterAgent(agent.id)}
                              disabled={registering === agent.id}
                              className="rounded-md px-2.5 py-1 text-xs font-medium border border-border bg-card text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
                            >
                              {registering === agent.id ? (
                                <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                        <div className="flex size-8 items-center justify-center rounded-md bg-white dark:bg-white/10">
                          {getRuntimeIcon(agent) ? (
                            <img
                              src={getRuntimeIcon(agent)}
                              alt={agent.name}
                              className="size-5 opacity-50"
                            />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {agent.name}
                            </span>
                            <ModelBadge model={agent.model} isLocalRuntime />
                            <RuntimeModeBadge mode={agent.communicationMode} />
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
                <p className="text-[11px] text-muted-foreground">{m.orchos_desc()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditAcpDialog
        runtime={editingRuntime}
        draft={editingDraft}
        saving={savingRuntimeId === editingRuntime?.id}
        onClose={() => setEditingRuntimeId(null)}
        onDraftChange={(patch) => {
          if (!editingRuntime) return;
          updateRuntimeDraft(editingRuntime.id, patch);
        }}
        onSave={() => {
          if (!editingRuntime) return;
          void handleSaveRuntimeConfig(editingRuntime);
        }}
      />
    </div>
  );
}
