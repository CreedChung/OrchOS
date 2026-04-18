import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ControlSettings } from "@/lib/types";

type SourceFilter = "all" | "github_pr" | "github_issue" | "mention" | "agent_request";
type GoalStatusFilter = "all" | "active" | "completed" | "paused";
type ScopeFilter = "all" | "global" | "project";
type CreationArchiveFilter = "all" | "active" | "archived" | "deleted";
type EnvironmentSection = "projects" | "runtimes" | "env-vars";
type ThemeMode = "light" | "dark" | "auto";

interface UIState {
  // Navigation & selection
  activeGoalId: string | null;
  activeAgentId: string | null;
  activeInboxId: string | null;
  activeOrganizationId: string | null;

  // Filters
  sourceFilter: SourceFilter;
  goalStatusFilter: GoalStatusFilter;
  scopeFilter: ScopeFilter;
  creationArchiveFilter: CreationArchiveFilter;
  environmentSection: EnvironmentSection;

  // Panel states
  activityPanelOpen: boolean;

  // Theme
  theme: ThemeMode;

  // Settings (persisted locally, also synced with server)
  settings: ControlSettings | null;
}

interface UIActions {
  setActiveGoalId: (id: string | null) => void;
  setActiveAgentId: (id: string | null) => void;
  setActiveInboxId: (id: string | null) => void;
  setActiveOrganizationId: (id: string | null) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  setGoalStatusFilter: (filter: GoalStatusFilter) => void;
  setScopeFilter: (filter: ScopeFilter) => void;
  setCreationArchiveFilter: (filter: CreationArchiveFilter) => void;
  setEnvironmentSection: (section: EnvironmentSection) => void;
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  setTheme: (mode: ThemeMode) => void;
  setSettings: (settings: ControlSettings) => void;
}

const defaultSettings: ControlSettings = {
  autoCommit: false,
  autoFix: false,
  modelStrategy: "adaptive",
  locale: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  notifications: { system: true, sound: true, eventSounds: {} },
};

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      // Navigation & selection
      activeGoalId: null,
      activeAgentId: null,
      activeInboxId: null,
      activeOrganizationId: null,

      // Filters
      sourceFilter: "all" as SourceFilter,
      goalStatusFilter: "all" as GoalStatusFilter,
      scopeFilter: "all" as ScopeFilter,
      creationArchiveFilter: "all" as CreationArchiveFilter,
      environmentSection: "projects" as EnvironmentSection,

      // Panel states
      activityPanelOpen: false,

      // Theme
      theme: "auto" as ThemeMode,

      // Settings
      settings: defaultSettings,

      setActiveGoalId: (id) => set({ activeGoalId: id }),
      setActiveAgentId: (id) => set({ activeAgentId: id }),
      setActiveInboxId: (id) => set({ activeInboxId: id }),
      setActiveOrganizationId: (id) => set({ activeOrganizationId: id }),
      setSourceFilter: (filter) => set({ sourceFilter: filter }),
      setGoalStatusFilter: (filter) => set({ goalStatusFilter: filter }),
      setScopeFilter: (filter) => set({ scopeFilter: filter }),
      setCreationArchiveFilter: (filter) => set({ creationArchiveFilter: filter }),
      setEnvironmentSection: (section) => set({ environmentSection: section }),
      setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
      toggleActivityPanel: () => set((s) => ({ activityPanelOpen: !s.activityPanelOpen })),
      setTheme: (mode) => set({ theme: mode }),
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: "orchos-ui",
      version: 1,
    },
  ),
);
