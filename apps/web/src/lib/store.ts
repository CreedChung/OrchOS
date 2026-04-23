import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ControlSettings } from "@/lib/types";

type SourceFilter = "all" | "github_pr" | "github_issue" | "mention" | "agent_request";
type GoalStatusFilter = "all" | "active" | "completed" | "paused";
type ScopeFilter = "all" | "global" | "project";
type CreationArchiveFilter = "all" | "active" | "archived";
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

  // Panel states
  activityPanelOpen: boolean;
  sidebarCollapsed: boolean;
  creationSidebarCollapsed: boolean;
  creationSidebarWidth: number;

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
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCreationSidebarCollapsed: (collapsed: boolean) => void;
  toggleCreationSidebar: () => void;
  setCreationSidebarWidth: (width: number) => void;
  setTheme: (mode: ThemeMode) => void;
  setSettings: (settings: ControlSettings) => void;
}

const defaultSettings: ControlSettings = {
  autoCommit: false,
  autoFix: false,
  modelStrategy: "adaptive",
  locale: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  projectChatsRequireSandbox: true,
  notifications: { system: true, sound: true, eventSounds: {}, eventSoundFiles: {} },
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

      // Panel states
      activityPanelOpen: false,
      sidebarCollapsed: false,
      creationSidebarCollapsed: false,
      creationSidebarWidth: 288,

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
      setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
      toggleActivityPanel: () => set((s) => ({ activityPanelOpen: !s.activityPanelOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCreationSidebarCollapsed: (collapsed) => set({ creationSidebarCollapsed: collapsed }),
      toggleCreationSidebar: () => set((s) => ({ creationSidebarCollapsed: !s.creationSidebarCollapsed })),
      setCreationSidebarWidth: (width) => set({ creationSidebarWidth: width }),
      setTheme: (mode) => set({ theme: mode }),
      setSettings: (settings) => set({ settings }),
    }),
    {
      name: "orchos-ui",
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const state = persisted as Record<string, unknown>;
          state.creationSidebarWidth = 288;
        }
        return persisted;
      },
    },
  ),
);
