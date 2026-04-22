import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useUser, useClerk } from "@clerk/clerk-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardContent,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
} from "@/components/ui/info-card";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Cancel01Icon,
  InformationCircleIcon,
  KeyboardIcon,
  Key01Icon,
  NotificationIcon,
  Target01Icon,
  Robot02Icon,
  ChevronDown,
  ChevronUp,
  Settings02Icon,
  Tick02Icon,
  MoreHorizontal,
  Edit02Icon,
  Delete02Icon,
  FolderGitIcon,
  Wrench01Icon,
  Folder01Icon,
  AiBrain01Icon,
  UserCircleIcon,
  Logout03Icon,
  Chat01Icon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";
import type { Organization, Problem, SidebarView } from "@/lib/types";
import { isInboxItem } from "@/lib/types";

interface SidebarSection {
  label: string;
  items: {
    id: SidebarView;
    to: string;
    icon: IconSvgElement;
    label: string;
    shortcut?: string;
    badge?: number;
    badgeCritical?: boolean;
  }[];
}

interface SidebarProps {
  organizations: Organization[];
  problems: Problem[];
  activeOrganizationId: string | null;
  activeView: SidebarView;
  onOpenSettings: () => void;
  onOrganizationChange: (id: string) => void;
  onOrganizationRename: (id: string, name: string) => void;
  onOrganizationDelete: (id: string) => void;
}

export function Sidebar({
  organizations,
  problems,
  activeOrganizationId,
  activeView,
  onOpenSettings,
  onOrganizationChange,
  onOrganizationRename,
  onOrganizationDelete,
}: SidebarProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const openInboxCount = problems.filter((p) => p.status === "open" && isInboxItem(p)).length;
  const criticalCount = problems.filter(
    (p) => p.status === "open" && isInboxItem(p) && p.priority === "critical",
  ).length;

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(window.navigator.platform));
  }, []);

  const sections: SidebarSection[] = [
    {
      label: "",
      items: [
        {
          id: "creation",
          to: "/dashboard/creation",
          icon: Chat01Icon,
          label: m.creation(),
          shortcut: `${isMac ? "Cmd" : "Ctrl"}+K`,
        },
      ],
    },
    {
      label: m.workspace(),
      items: [
        {
          id: "projects",
          to: "/dashboard/projects",
          icon: Folder01Icon,
          label: m.project(),
          badge: openInboxCount,
          badgeCritical: criticalCount > 0,
        },
      ],
    },
    {
      label: m.capabilities(),
      items: [
        { id: "agents", to: "/dashboard/agents", icon: Robot02Icon, label: m.agents() },
        {
          id: "mcp-servers",
          to: "/dashboard/mcp-servers",
          icon: FolderGitIcon,
          label: m.mcp_servers(),
        },
        { id: "skills", to: "/dashboard/skills", icon: Wrench01Icon, label: m.skills() },
      ],
    },
    {
      label: m.observability(),
      items: [
        {
          id: "observability",
          to: "/dashboard/observability",
          icon: AiBrain01Icon,
          label: m.observability(),
        },
      ],
    },
  ];

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-sidebar">
      {/* Organization Selector */}
      <div className="flex h-11 items-center border-b border-border px-4">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HugeiconsIcon icon={Target01Icon} className="size-3.5" />
            </span>
            <span className="truncate">
              {organizations.find((o) => o.id === activeOrganizationId)?.name ||
                m.select_organization()}
            </span>
            <HugeiconsIcon icon={ChevronDown} className="ml-auto size-3 shrink-0 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            {organizations.length > 0 ? (
              organizations.map((org) => (
                <DropdownMenuItem key={org.id} onClick={() => onOrganizationChange(org.id)}>
                  <span className="flex-1">{org.name}</span>
                  {org.id === activeOrganizationId && (
                    <HugeiconsIcon icon={Tick02Icon} className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                {m.no_organizations()}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {activeOrganizationId && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
              <HugeiconsIcon icon={MoreHorizontal} className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-36">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                {m.rename()}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                {m.delete()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Navigation Sections */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-1">
          {sections.map((section, si) => (
            <div key={si} className="space-y-0.5">
              <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </span>
              {section.items.map(
                ({ id, to, icon: Icon, label, shortcut, badge, badgeCritical }) => {
                  const isActive = activeView === id;
                  return (
                    <Link
                      key={id}
                      to={to}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={Icon} className="size-4 shrink-0" />
                      <span className="flex-1 text-left">{label}</span>
                      {shortcut && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                            isActive
                              ? "border-sidebar-foreground/15 bg-sidebar-background/60 text-sidebar-foreground/60"
                              : "border-border/60 bg-background/70 text-muted-foreground",
                          )}
                          aria-label={`Shortcut ${shortcut}`}
                        >
                          <HugeiconsIcon icon={KeyboardIcon} className="size-3 shrink-0" />
                          {shortcut}
                        </span>
                      )}
                      {badge != null && badge > 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                            badgeCritical
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                },
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Info Card */}
      <div className="px-3 pb-2">
        <InfoCard storageKey="sidebar-welcome" dismissType="forever">
          <InfoCardContent>
            <InfoCardTitle>{m.welcome_to_orchos()}</InfoCardTitle>
            <InfoCardDescription>{m.welcome_desc()}</InfoCardDescription>
          </InfoCardContent>
          <InfoCardMedia
            media={[
              {
                src: "/background.png",
                alt: "OrchOS",
              },
            ]}
            shrinkHeight={60}
            expandHeight={120}
          />
          <InfoCardFooter>
            <InfoCardDismiss>{m.dismiss()}</InfoCardDismiss>
          </InfoCardFooter>
        </InfoCard>
      </div>

      {/* Bottom: User Profile */}
      <div className="border-t border-border p-2">
        <ClerkUserProfile onOpenSettings={onOpenSettings} />
      </div>

      <RenameDialog
        open={renameOpen}
        title={m.rename_organization()}
        initialValue={organizations.find((o) => o.id === activeOrganizationId)?.name ?? ""}
        placeholder={m.organization_name_placeholder()}
        onClose={() => setRenameOpen(false)}
        onSubmit={(name) => {
          if (activeOrganizationId) onOrganizationRename(activeOrganizationId, name);
          setRenameOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={m.delete_organization()}
        description={m.delete_organization()}
        onConfirm={() => {
          if (activeOrganizationId) onOrganizationDelete(activeOrganizationId);
        }}
        confirmLabel={m.delete()}
        variant="destructive"
      />
    </aside>
  );
}

function ClerkUserProfile({ onOpenSettings }: { onOpenSettings: () => void }) {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isClerkConfigured) {
    return (
      <>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{m.user()}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">user@orchos.dev</p>
            </div>
            <HugeiconsIcon icon={ChevronUp} className="size-3 shrink-0 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="mb-1 min-w-[var(--radix-dropdown-menu-trigger-width)]"
          >
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
              {m.profile_settings()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
              {m.settings()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ProfileEditDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          fallbackName={m.user()}
          fallbackEmail="user@orchos.dev"
        />
      </>
    );
  }

  return <ClerkAuthenticatedProfile onOpenSettings={onOpenSettings} />;
}

function ClerkAuthenticatedProfile({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isLoaded) {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
          </div>
          <span className="flex-1 truncate text-left">{m.user()}</span>
          <HugeiconsIcon icon={ChevronUp} className="size-3 shrink-0 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="min-w-48 mb-1">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              U
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{m.user()}</p>
              <p className="text-xs text-muted-foreground truncate">user@orchos.dev</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
            {m.settings()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (!user) return null;

  const displayName = user.fullName || user.username || m.user();
  const email = user.primaryEmailAddress?.emailAddress || "";
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || user.username?.[0] || user.fullName?.[0] || "U"}`
      .trim()
      .slice(0, 2)
      .toUpperCase();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/50 cursor-pointer">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{email}</p>
          </div>
          <HugeiconsIcon
            icon={ChevronUp}
            className="size-3 shrink-0 opacity-50 text-sidebar-foreground/70"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="mb-1 min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
            {m.profile_settings()}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenSettings}>
            <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
            {m.settings()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
          >
            <HugeiconsIcon icon={Logout03Icon} className="size-3.5" />
            {m.log_out()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileEditDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        clerkUser={user}
        fallbackName={displayName}
        fallbackEmail={email}
      />
    </>
  );
}

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkUser?: ReturnType<typeof useUser>["user"];
  fallbackName: string;
  fallbackEmail: string;
}

type ProfileDialogTab = "profile" | "security" | "preferences";

const profileTabDefs: {
  id: ProfileDialogTab;
  icon: IconSvgElement;
  label: () => string;
}[] = [
  { id: "profile", icon: UserCircleIcon, label: m.profile_tab_profile },
  { id: "security", icon: Key01Icon, label: m.profile_tab_security },
  { id: "preferences", icon: NotificationIcon, label: m.profile_tab_preferences },
];

function ProfileEditDialog({
  open,
  onOpenChange,
  clerkUser,
  fallbackName,
  fallbackEmail,
}: ProfileEditDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileDialogTab>("profile");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName(clerkUser?.firstName || "");
    setLastName(clerkUser?.lastName || "");
    setUsername(clerkUser?.username || "");
    setActiveTab("profile");
    setSaving(false);
    setError(null);
  }, [clerkUser, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clerkUser) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await clerkUser.update({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        username: username.trim() || null,
      });
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const displayEmail = clerkUser?.primaryEmailAddress?.emailAddress || fallbackEmail;
  const canEdit = !!clerkUser;
  const displayName = clerkUser?.fullName || fallbackName;
  const activeTabLabel =
    profileTabDefs.find((tab) => tab.id === activeTab)?.label() || m.profile_tab_profile();
  const hasPassword = clerkUser?.passwordEnabled;
  const hasTwoFactor = clerkUser?.twoFactorEnabled;
  const emailVerified = clerkUser?.primaryEmailAddress?.verification?.status === "verified";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Popup className="relative z-50 flex h-[600px] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/30">
              <div className="flex h-12 items-center px-4">
                <HugeiconsIcon
                  icon={UserCircleIcon}
                  className="mr-2 size-4 text-muted-foreground"
                />
                <span className="text-sm font-semibold text-foreground">
                  {m.profile_settings()}
                </span>
              </div>
              <nav className="flex-1 space-y-0.5 px-2 py-1">
                {profileTabDefs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        activeTab === tab.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={Icon} className="size-4" />
                      {tab.label()}
                    </button>
                  );
                })}
              </nav>
              <div className="flex h-24 items-center border-t border-border p-3">
                <div className="flex w-full items-center gap-3 rounded-lg border border-border/50 bg-card px-3 py-3">
                  {clerkUser?.imageUrl ? (
                    <img
                      src={clerkUser.imageUrl}
                      alt={displayName}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {displayName.slice(0, 1).toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayEmail || m.profile_no_email()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-12 items-center justify-between border-b border-border px-6">
                <div>
                  <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                    {activeTabLabel}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    {m.profile_basic_info_desc()}
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="mb-1">
                        <p className="text-sm font-medium text-foreground">
                          {m.profile_basic_info()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.profile_basic_info_desc()}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">
                            {m.profile_first_name()}
                          </label>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            disabled={!canEdit || saving}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">
                            {m.profile_last_name()}
                          </label>
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            disabled={!canEdit || saving}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                          {m.profile_username()}
                        </label>
                        <input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={!canEdit || saving}
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="mb-1">
                        <p className="text-sm font-medium text-foreground">
                          {m.profile_login_email()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.profile_login_email_desc()}
                        </p>
                      </div>
                      <input
                        value={displayEmail}
                        readOnly
                        className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
                      />
                    </div>

                    {error ? <p className="text-sm text-destructive">{error}</p> : null}
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-4">
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={Key01Icon} className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          {m.profile_security_section()}
                        </p>
                      </div>
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-foreground">
                              {m.profile_email_verification()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.profile_email_verification_desc()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[10px] font-medium",
                              emailVerified
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {emailVerified
                              ? m.profile_status_verified()
                              : m.profile_status_unverified()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-foreground">{m.profile_password_signin()}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.profile_password_signin_desc()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[10px] font-medium",
                              hasPassword
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {hasPassword ? m.profile_status_enabled() : m.profile_status_disabled()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                          <div>
                            <p className="text-sm text-foreground">{m.profile_two_factor()}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.profile_two_factor_desc()}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-md px-2.5 py-1 text-[10px] font-medium",
                              hasTwoFactor
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {hasTwoFactor
                              ? m.profile_status_enabled()
                              : m.profile_status_disabled()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "preferences" && (
                  <div className="space-y-4">
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={InformationCircleIcon}
                          className="size-4 text-muted-foreground"
                        />
                        <p className="text-sm font-medium text-foreground">
                          {m.profile_preferences_info()}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {m.profile_preferences_info_desc()}
                      </p>
                    </div>

                    <Tabs value="preferences" className="w-full">
                      <TabsList>
                        <TabsTrigger value="preferences">
                          {m.profile_preferences_personal()}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                )}
              </div>

              <div className="flex h-24 items-center justify-end gap-2 border-t border-border px-6 py-4">
                <DialogPrimitive.Close className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                  {m.cancel()}
                </DialogPrimitive.Close>
                <Button type="submit" disabled={activeTab !== "profile" || !canEdit || saving}>
                  {saving ? m.profile_saving() : m.save()}
                </Button>
              </div>
            </form>
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
