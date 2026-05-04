import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/clerk-react";
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
  Shield01Icon,
  UserCircleIcon,
  Logout03Icon,
  Chat01Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Add01Icon,
  Mail01Icon,
  UserGroupIcon,
  UserAdd02Icon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RenameDialog } from "@/components/dialogs/RenameDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";
import type { Organization, Problem, SidebarView } from "@/lib/types";
import { isInboxItem } from "@/lib/types";
import { toast } from "sonner";

const TEAM_PAGE_SIZE = 8;

type TeamDialogTab = "members" | "invitations" | "invite" | "organization";

const teamManagementCache = new Map<string, { members: any[]; invitations: any[]; updatedAt: number }>();

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
  collapsed: boolean;
  onOpenSettings: () => void;
  onOrganizationChange: (id: string) => void;
  onOrganizationCreate: (name: string) => Promise<void>;
  onOrganizationRename: (id: string, name: string) => void;
  onOrganizationDelete: (id: string) => void;
  onToggleCollapse: () => void;
}

export function Sidebar({
  organizations,
  problems,
  activeOrganizationId,
  activeView,
  collapsed,
  onOpenSettings,
  onOrganizationChange,
  onOrganizationCreate,
  onOrganizationRename,
  onOrganizationDelete,
  onToggleCollapse,
}: SidebarProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [isMac, setIsMac] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(!collapsed);
  const openInboxCount = problems.filter((p) => p.status === "open" && isInboxItem(p)).length;
  const criticalCount = problems.filter(
    (p) => p.status === "open" && isInboxItem(p) && p.priority === "critical",
  ).length;
  const activeOrganization = organizations.find((o) => o.id === activeOrganizationId) ?? null;
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(orgSearch.trim().toLowerCase()),
  );

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(window.navigator.platform));
  }, []);

  useEffect(() => {
    if (collapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [collapsed]);

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
        { id: "rules", to: "/dashboard/rules", icon: Shield01Icon, label: "Rules" },
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
    <TooltipProvider delay={0}>
        <aside
          className={cn(
            "flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-out",
            collapsed ? "w-14" : "w-60",
          )}
        >
        {/* Organization Selector */}
        <div className="relative flex h-11 items-center border-b border-border px-2">
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 pr-9 transition-opacity duration-300 ease-out",
              !showExpandedContent
                ? "pointer-events-none absolute opacity-0 delay-0"
                : "opacity-100 delay-180",
            )}
          >
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <HugeiconsIcon icon={Target01Icon} className="size-3.5" />
                  </span>
                  <span className="truncate">
                    {organizations.find((o) => o.id === activeOrganizationId)?.name ||
                      m.select_organization()}
                  </span>
                  <HugeiconsIcon icon={ChevronDown} className="ml-auto size-3 shrink-0 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-64">
                  <div className="p-2">
                    <Input
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder={m.org_launcher_search_placeholder()}
                      className="h-8"
                    />
                  </div>
                  {activeOrganization ? (
                    <>
                      <DropdownMenuLabel>{m.org_launcher_current()}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onOrganizationChange(activeOrganization.id)}>
                        <span className="flex-1">{activeOrganization.name}</span>
                        <HugeiconsIcon icon={Tick02Icon} className="size-4 text-primary" />
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuLabel>{m.org_launcher_all()}</DropdownMenuLabel>
                  {filteredOrganizations.length > 0 ? (
                    filteredOrganizations.map((org) => (
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
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{m.team_create_organization()}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setCreateOrgOpen(true)}>
                    <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
                    {m.team_create_organization()}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {activeOrganizationId && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="ml-1 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
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
          <button
            onClick={onToggleCollapse}
            className={cn(
              "absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer",
            )}
          >
            <HugeiconsIcon icon={collapsed ? SidebarRight01Icon : SidebarLeft01Icon} className="size-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <ScrollArea className="flex-1">
          <div
            className={cn(
              "space-y-1 px-2 pb-2 pt-2",
              collapsed && "flex flex-col items-center",
            )}
          >
            {sections.map((section, si) => (
              <div key={si} className={cn("space-y-0.5", collapsed && "flex w-full flex-col items-center")}>
                {section.label && (
                    <span
                      className={cn(
                        "block h-5 overflow-hidden px-2.5 text-[10px] leading-5 font-semibold uppercase tracking-wider text-muted-foreground/60 transition-opacity duration-300 ease-out",
                        !showExpandedContent
                          ? "opacity-0 delay-0"
                          : "opacity-100 delay-180",
                      )}
                      aria-hidden={!showExpandedContent}
                    >
                    {section.label}
                  </span>
                )}
                {section.items.map(
                  ({ id, to, icon: Icon, label, shortcut, badge, badgeCritical }) => {
                    const isActive = activeView === id;
                    const navItem = (
                      <Link
                        key={id}
                        to={to}
                        className={cn(
                          "flex h-10 items-center rounded-md transition-colors",
                          collapsed
                            ? "mx-auto size-10 justify-center gap-0 px-0"
                            : "w-full gap-2.5 px-2.5 text-sm",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                      >
                        <HugeiconsIcon icon={Icon} className="size-4 shrink-0" />
                        <span
                          className={cn(
                            "text-left overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-out",
                            !showExpandedContent
                              ? "w-0 shrink-0 opacity-0 delay-0"
                              : "min-w-0 flex-1 opacity-100 delay-180",
                          )}
                        >
                          {label}
                        </span>
                        {showExpandedContent && shortcut && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums transition-opacity duration-300 ease-out opacity-100 delay-220",
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
                              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums overflow-hidden whitespace-nowrap transition-[opacity,width,padding,margin] duration-300 ease-out",
                              !showExpandedContent
                                ? "w-0 shrink-0 px-0 py-0 opacity-0 delay-0"
                                : "opacity-100 delay-220",
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
                    if (collapsed) {
                      return (
                        <Tooltip key={id}>
                          <TooltipTrigger
                            render={(_props) => <div className="flex w-full justify-center">{navItem}</div>}
                          />
                          <TooltipContent side="right">{label}</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return navItem;
                  },
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Info Card */}
          <div
            className={cn(
              "px-3 pb-2 transition-opacity duration-200 ease-out",
              !showExpandedContent ? "hidden pointer-events-none opacity-0" : "block opacity-100 delay-300",
            )}
          >
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
        <div className={cn("border-t border-border", collapsed ? "flex justify-center p-2" : "p-2")}>
          <ClerkUserProfile
            onOpenSettings={onOpenSettings}
            collapsed={collapsed}
            showExpandedContent={showExpandedContent}
          />
        </div>

        <RenameDialog
          open={createOrgOpen}
          title={m.team_create_organization()}
          initialValue=""
          placeholder={m.team_create_organization_placeholder()}
          onClose={() => setCreateOrgOpen(false)}
          onSubmit={async (name) => {
            await onOrganizationCreate(name);
            toast.success(m.org_launcher_created());
            setCreateOrgOpen(false);
          }}
        />

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
    </TooltipProvider>
  );
}

function ClerkUserProfile({
  onOpenSettings,
  collapsed,
  showExpandedContent,
}: {
  onOpenSettings: () => void;
  collapsed: boolean;
  showExpandedContent: boolean;
}) {
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!isClerkConfigured) {
    if (collapsed) {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            disableAnimation
            className="min-w-48"
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
      );
    }

    return (
      <>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
            <div className={cn("min-w-0 flex-1 text-left", !showExpandedContent && "invisible")}>
              <p className="truncate text-sm font-medium text-sidebar-foreground">{m.user()}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">user@orchos.dev</p>
            </div>
            <HugeiconsIcon
              icon={ChevronUp}
              className={cn("size-3 shrink-0 opacity-50", !showExpandedContent && "invisible")}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            disableAnimation
            className="mb-1 min-w-(--anchor-width)"
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

  return (
    <ClerkAuthenticatedProfile
      onOpenSettings={onOpenSettings}
      collapsed={collapsed}
      showExpandedContent={showExpandedContent}
    />
  );
}

function ClerkAuthenticatedProfile({
  onOpenSettings,
  collapsed,
  showExpandedContent,
}: {
  onOpenSettings: () => void;
  collapsed: boolean;
  showExpandedContent: boolean;
}) {
  const { user, isLoaded } = useUser();
  const { isLoaded: isOrganizationLoaded } = useOrganization();
  const { signOut } = useClerk();
  const [profileOpen, setProfileOpen] = useState(false);
  const [teamManagementOpen, setTeamManagementOpen] = useState(false);

  if (!isLoaded) {
    if (collapsed) {
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-md transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" disableAnimation className="min-w-48 mb-1">
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

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground cursor-pointer">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserCircleIcon} className="size-4" />
          </div>
          <span className={cn("flex-1 truncate text-left", !showExpandedContent && "invisible")}>{m.user()}</span>
          <HugeiconsIcon
            icon={ChevronUp}
            className={cn("size-3 shrink-0 opacity-50", !showExpandedContent && "invisible")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" disableAnimation className="mb-1 min-w-(--anchor-width)">
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
        <DropdownMenuTrigger
          className={cn(
            "h-10 rounded-md text-left hover:bg-sidebar-accent/50 cursor-pointer",
            collapsed
              ? "flex size-10 items-center justify-center"
              : "flex w-full items-center gap-2.5 px-2.5",
          )}
        >
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className={cn("shrink-0 rounded-full object-cover", collapsed ? "size-8" : "size-8")}
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className={cn("min-w-0 flex-1", !showExpandedContent && "invisible")}>
                <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{email}</p>
              </div>
              <HugeiconsIcon
                icon={ChevronUp}
                className={cn(
                  "size-3 shrink-0 opacity-50 text-sidebar-foreground/70",
                  !showExpandedContent && "invisible",
                )}
              />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          disableAnimation
          className={cn("mb-1", collapsed ? "min-w-48" : "min-w-(--anchor-width)")}
        >
          {collapsed && (
            <>
              <div className="flex items-center gap-2.5 px-2 py-2">
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={displayName}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
            {m.profile_settings()}
          </DropdownMenuItem>
          {isOrganizationLoaded ? (
            <DropdownMenuItem onClick={() => setTeamManagementOpen(true)}>
              <HugeiconsIcon icon={Shield01Icon} className="size-3.5" />
              {m.team_management()}
            </DropdownMenuItem>
          ) : null}
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
      <TeamManagementDialog open={teamManagementOpen} onOpenChange={setTeamManagementOpen} />
    </>
  );
}

function TeamManagementDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { organization, membership, isLoaded } = useOrganization();
  const { setActive, createOrganization } = useOrganizationList();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [createName, setCreateName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org:member");
  const [activeTab, setActiveTab] = useState<TeamDialogTab>("members");
  const [memberQuery, setMemberQuery] = useState("");
  const [invitationQuery, setInvitationQuery] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [invitationPage, setInvitationPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; role: string } | null>(null);

  const canManageTeam =
    !!organization && (membership?.role === "org:admin" || membership?.role === "org:owner");

  const roleOptions = useMemo(() => {
    const options = [{ value: "org:member", label: m.team_role_member() }];
    if (membership?.role === "org:owner") {
      options.unshift({ value: "org:admin", label: m.team_role_admin() });
    }
    return options;
  }, [membership?.role]);

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const user = member.publicUserData;
      const haystack = [user?.firstName, user?.lastName, user?.identifier, user?.userId, member.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [members, memberQuery]);

  const filteredInvitations = useMemo(() => {
    const query = invitationQuery.trim().toLowerCase();
    if (!query) return invitations;
    return invitations.filter((invitation) => {
      const haystack = [invitation.emailAddress, invitation.roleName, invitation.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [invitations, invitationQuery]);

  const pagedMembers = useMemo(() => {
    const start = (memberPage - 1) * TEAM_PAGE_SIZE;
    return filteredMembers.slice(start, start + TEAM_PAGE_SIZE);
  }, [filteredMembers, memberPage]);

  const pagedInvitations = useMemo(() => {
    const start = (invitationPage - 1) * TEAM_PAGE_SIZE;
    return filteredInvitations.slice(start, start + TEAM_PAGE_SIZE);
  }, [filteredInvitations, invitationPage]);

  const totalMemberPages = Math.max(1, Math.ceil(filteredMembers.length / TEAM_PAGE_SIZE));
  const totalInvitationPages = Math.max(1, Math.ceil(filteredInvitations.length / TEAM_PAGE_SIZE));
  const pendingRoleChangeTarget =
    pendingRoleChange && members.find((member) => member.publicUserData?.userId === pendingRoleChange.userId);
  const organizationId = organization?.id || null;
  const cacheKey = organization?.id || "__no_org__";

  const teamTabDefs: { id: TeamDialogTab; icon: IconSvgElement; label: string }[] = [
    { id: "members", icon: UserGroupIcon, label: m.team_members() },
    { id: "invitations", icon: Mail01Icon, label: m.team_pending_invitations() },
    { id: "invite", icon: UserAdd02Icon, label: m.team_invite_member() },
    { id: "organization", icon: Add01Icon, label: m.team_create_organization() },
  ];

  useEffect(() => {
    if (!open || !organization || !organizationId || !canManageTeam) return;

    let cancelled = false;
    const cached = teamManagementCache.get(cacheKey);
    if (cached) {
      setMembers(cached.members);
      setInvitations(cached.invitations);
      setMemberPage(1);
      setInvitationPage(1);
      setLoadingData(false);
    } else {
      setLoadingData(true);
    }
    setError(null);

    void Promise.all([
      organization.getMemberships({ limit: 100 }),
      organization.getInvitations({ limit: 100, status: ["pending"] }),
    ])
      .then(([membershipResult, invitationResult]) => {
        if (cancelled) return;
        setMembers(membershipResult.data);
        setInvitations(invitationResult.data);
        setMemberPage(1);
        setInvitationPage(1);
        teamManagementCache.set(cacheKey, {
          members: membershipResult.data,
          invitations: invitationResult.data,
          updatedAt: Date.now(),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : m.team_failed_load());
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, organizationId, canManageTeam, cacheKey]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(organization ? "members" : "organization");
  }, [open, organizationId]);

  useEffect(() => {
    setMemberPage(1);
  }, [memberQuery]);

  useEffect(() => {
    setInvitationPage(1);
  }, [invitationQuery]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createOrganization) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createOrganization({ name: createName.trim() });
      await setActive?.({ organization: created.id });
      setCreateName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : m.team_failed_create_org());
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !inviteEmail.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await organization.inviteMember({
        emailAddress: inviteEmail.trim(),
        role: inviteRole,
      });
      const invitationResult = await organization.getInvitations({ limit: 100, status: ["pending"] });
      setInvitations(invitationResult.data);
      teamManagementCache.set(cacheKey, {
        members,
        invitations: invitationResult.data,
        updatedAt: Date.now(),
      });
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : m.team_failed_invite_member());
    } finally {
      setSubmitting(false);
    }
  };

  const applyMemberRoleChange = async (userId: string, role: string) => {
    if (!organization) return;
    setError(null);
    try {
      await organization.updateMember({ userId, role });
      const membershipResult = await organization.getMemberships({ limit: 100 });
      setMembers(membershipResult.data);
      teamManagementCache.set(cacheKey, {
        members: membershipResult.data,
        invitations,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : m.team_failed_update_member_role());
    }
  };

  const handleUpdateMemberRole = (member: any, userId: string, role: string) => {
    if (member.role === role) return;
    if (!canManageRole(member)) return;
    setPendingRoleChange({ userId, role });
  };

  const handleRemoveMember = async (member: any) => {
    if (!organization) return;
    const userId = member.publicUserData?.userId;
    if (!userId) return;
    if (membership?.publicUserData?.userId === userId) {
      setError(m.team_cannot_remove_self());
      return;
    }
    if (membership?.role === "org:admin" && member.role === "org:owner") {
      setError(m.team_owner_protected());
      return;
    }
    setMemberToRemove(member);
  };

  const applyRemoveMember = async () => {
    if (!organization || !memberToRemove) return;
    const userId = memberToRemove.publicUserData?.userId;
    if (!userId) return;
    setError(null);
    try {
      await organization.removeMember(userId);
      const membershipResult = await organization.getMemberships({ limit: 100 });
      setMembers(membershipResult.data);
      teamManagementCache.set(cacheKey, {
        members: membershipResult.data,
        invitations,
        updatedAt: Date.now(),
      });
      setMemberToRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : m.team_failed_remove_member());
    }
  };

  const handleRevokeInvitation = async (invitation: any) => {
    setError(null);
    try {
      await invitation.revoke();
      setInvitations((prev) => {
        const nextInvitations = prev.filter((item) => item.id !== invitation.id);
        teamManagementCache.set(cacheKey, {
          members,
          invitations: nextInvitations,
          updatedAt: Date.now(),
        });
        return nextInvitations;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : m.team_failed_revoke_invitation());
    }
  };

  const canManageRole = (member: any) => {
    if (!membership) return false;
    if (membership.role === "org:owner") return true;
    return membership.role === "org:admin" && member.role !== "org:owner";
  };

  const canRemoveMember = (member: any) => {
    const userId = member.publicUserData?.userId;
    if (!membership || !userId) return false;
    if (userId === membership.publicUserData?.userId) return false;
    if (membership.role === "org:owner") return true;
    return membership.role === "org:admin" && member.role !== "org:owner";
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Popup className="relative z-50 flex h-[720px] w-full max-w-6xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <div className="flex w-56 shrink-0 flex-col border-r border-border bg-muted/30">
              <div className="flex h-12 items-center px-4">
                <HugeiconsIcon icon={Shield01Icon} className="mr-2 size-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{m.team_management()}</span>
              </div>
              <div className="px-4 pb-4 text-xs text-muted-foreground">{m.team_management_desc()}</div>
              <nav className="flex-1 space-y-0.5 px-2 py-1">
                {teamTabDefs.map((tab) => (
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
                    <HugeiconsIcon icon={tab.icon} className="size-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
              <div className="mt-auto border-t border-border p-4">
                <div className="rounded-lg border border-border/50 bg-card px-3 py-3">
                  <p className="truncate text-sm font-medium text-foreground">{organization?.name || m.select_organization()}</p>
                  <p className="truncate text-xs text-muted-foreground">{membership?.role || ""}</p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-12 items-center justify-between border-b border-border px-6">
                <div>
                  <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                    {m.team_management()}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    {m.team_management_desc()}
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
              {!isLoaded ? (
                <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted-foreground">
                  {m.loading()}
                </div>
              ) : canManageTeam ? (
                <div className="space-y-4">
                  {activeTab === "members" ? (
                    <>
                      <div className="space-y-2 rounded-lg border border-border/50 p-4">
                        <div className="mb-1">
                          <p className="text-sm font-medium text-foreground">{m.team_members()}</p>
                          <p className="text-xs text-muted-foreground">{m.team_members_desc()}</p>
                        </div>
                        <Input
                          value={memberQuery}
                          onChange={(e) => setMemberQuery(e.target.value)}
                          placeholder={m.team_search_members_placeholder()}
                        />
                      </div>
                      {loadingData ? (
                        <div className="space-y-2 rounded-lg border border-border/50 p-4">
                          {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-center gap-3 rounded-lg py-2.5">
                              <div className="size-9 shrink-0 rounded-full bg-muted animate-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                                <div className="h-2.5 w-40 rounded bg-muted animate-pulse" />
                              </div>
                              <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : pagedMembers.length > 0 ? (
                        <div className="rounded-lg border border-border/50 p-2">
                          {pagedMembers.map((member) => {
                            const user = member.publicUserData;
                            const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.identifier || m.team_unknown_user();
                            const initials = displayName
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase())
                              .join("") || "U";
                            const roleLabel =
                              member.role === "org:owner"
                                ? m.team_role_owner()
                                : member.role === "org:admin"
                                  ? m.team_role_admin()
                                  : m.team_role_member();
                            const roleBadgeClass =
                              member.role === "org:owner"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : member.role === "org:admin"
                                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                  : "bg-muted text-muted-foreground";
                            return (
                              <div key={member.id} className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
                                <div className="flex min-w-0 items-center gap-3">
                                  {user?.imageUrl ? (
                                    <img src={user.imageUrl} alt={displayName} className="size-9 shrink-0 rounded-full bg-muted object-cover" />
                                  ) : (
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                      {initials}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                                    <p className="truncate text-xs text-muted-foreground">{user?.identifier || user?.userId}</p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {canManageRole(member) ? (
                                    <Select
                                      value={member.role}
                                      onValueChange={(value) => handleUpdateMemberRole(member, user?.userId, value)}
                                    >
                                      <SelectTrigger className={`h-8 min-w-24 rounded-md border-0 px-2.5 text-[10px] font-medium shadow-none ${roleBadgeClass}`}>
                                        <SelectValue>{roleLabel}</SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          {member.role === "org:owner" ? (
                                            <SelectItem value="org:owner">{m.team_role_owner()}</SelectItem>
                                          ) : null}
                                          {roleOptions.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                              {role.label}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${roleBadgeClass}`}>
                                      {roleLabel}
                                    </span>
                                  )}
                                  {canRemoveMember(member) ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveMember(member)}
                                      className="h-7 gap-1 px-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                    >
                                      {m.team_remove()}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                          {filteredMembers.length > TEAM_PAGE_SIZE ? (
                            <div className="flex items-center justify-between border-t border-border/50 px-3 pt-2">
                              <Button size="sm" variant="outline" onClick={() => setMemberPage((page) => Math.max(1, page - 1))} disabled={memberPage === 1} className="h-7 text-xs">
                                {m.team_previous()}
                              </Button>
                              <span className="text-xs tabular-nums text-muted-foreground">{memberPage} / {totalMemberPages}</span>
                              <Button size="sm" variant="outline" onClick={() => setMemberPage((page) => Math.min(totalMemberPages, page + 1))} disabled={memberPage === totalMemberPages} className="h-7 text-xs">
                                {m.team_next()}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 py-8 text-center">
                          <p className="text-sm text-muted-foreground">{m.team_no_members()}</p>
                        </div>
                      )}
                    </>
                  ) : null}

                  {activeTab === "invitations" ? (
                    <>
                      <div className="space-y-2 rounded-lg border border-border/50 p-4">
                        <div className="mb-1">
                          <p className="text-sm font-medium text-foreground">{m.team_pending_invitations()}</p>
                          <p className="text-xs text-muted-foreground">{m.team_pending_invitations_desc()}</p>
                        </div>
                        <Input
                          value={invitationQuery}
                          onChange={(e) => setInvitationQuery(e.target.value)}
                          placeholder={m.team_search_invitations_placeholder()}
                        />
                      </div>
                      {loadingData ? (
                        <div className="space-y-2 rounded-lg border border-border/50 p-4">
                          {[1, 2].map((item) => (
                            <div key={item} className="flex items-center gap-3 rounded-lg py-2.5">
                              <div className="size-9 shrink-0 rounded-full bg-muted animate-pulse" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                                <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : pagedInvitations.length > 0 ? (
                        <div className="rounded-lg border border-border/50 p-2">
                          {pagedInvitations.map((invitation) => {
                            const invitationRoleLabel = invitation.role === "org:admin" ? m.team_role_admin() : m.team_role_member();
                            const invitationRoleBadgeClass =
                              invitation.role === "org:admin"
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                : "bg-muted text-muted-foreground";
                            return (
                              <div key={invitation.id} className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{invitation.emailAddress}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${invitationRoleBadgeClass}`}>
                                      {invitationRoleLabel}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">·</span>
                                    <span className="text-[11px] text-muted-foreground">Pending</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRevokeInvitation(invitation)}
                                  className="h-7 gap-1 px-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                >
                                  {m.team_revoke()}
                                </Button>
                              </div>
                            );
                          })}
                          {filteredInvitations.length > TEAM_PAGE_SIZE ? (
                            <div className="flex items-center justify-between border-t border-border/50 px-3 pt-2">
                              <Button size="sm" variant="outline" onClick={() => setInvitationPage((page) => Math.max(1, page - 1))} disabled={invitationPage === 1} className="h-7 text-xs">
                                {m.team_previous()}
                              </Button>
                              <span className="text-xs tabular-nums text-muted-foreground">{invitationPage} / {totalInvitationPages}</span>
                              <Button size="sm" variant="outline" onClick={() => setInvitationPage((page) => Math.min(totalInvitationPages, page + 1))} disabled={invitationPage === totalInvitationPages} className="h-7 text-xs">
                                {m.team_next()}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 py-8 text-center">
                          <HugeiconsIcon icon={Mail01Icon} className="mb-2 size-5 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">{m.team_no_pending_invitations()}</p>
                        </div>
                      )}
                    </>
                  ) : null}

                  {activeTab === "invite" ? (
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="mb-1">
                        <p className="text-sm font-medium text-foreground">{m.team_invite_member()}</p>
                        <p className="text-xs text-muted-foreground">{m.team_invite_member_desc()}</p>
                      </div>
                      <form className="space-y-3 pt-1" onSubmit={handleInviteMember}>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">{m.team_invite_email_placeholder()}</label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder={m.team_invite_email_placeholder()}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">{m.team_role_member()}</label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {roleOptions.find((role) => role.value === inviteRole)?.label || m.team_role_member()}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {roleOptions.map((role) => (
                                  <SelectItem key={role.value} value={role.value}>
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="submit" disabled={submitting || !inviteEmail.trim()} className="w-full">
                          {m.team_invite_member()}
                        </Button>
                      </form>
                    </div>
                  ) : null}

                  {activeTab === "organization" ? (
                    <div className="space-y-2 rounded-lg border border-border/50 p-4">
                      <div className="mb-1">
                        <p className="text-sm font-medium text-foreground">{m.team_create_organization()}</p>
                        <p className="text-xs text-muted-foreground">{m.team_create_organization_desc()}</p>
                      </div>
                      <form className="space-y-3 pt-1" onSubmit={handleCreateOrganization}>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-foreground">{m.team_create_organization_placeholder()}</label>
                          <Input
                            type="text"
                            value={createName}
                            onChange={(e) => setCreateName(e.target.value)}
                            placeholder={m.team_create_organization_placeholder()}
                          />
                        </div>
                        <Button type="submit" disabled={submitting || !createName.trim()} className="w-full" variant="outline">
                          {m.team_create_organization()}
                        </Button>
                      </form>
                    </div>
                  ) : null}

                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>
              ) : (
                <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-border/50 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">{m.team_management_unavailable()}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {organization ? m.team_management_admin_only() : m.team_management_create_org()}
                  </p>
                </div>
              )}
              </div>
            </div>
          </DialogPrimitive.Popup>
        </div>
      </DialogPrimitive.Portal>
      <ConfirmDialog
        open={!!pendingRoleChange}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingRoleChange(null);
        }}
        title={m.team_confirm_role_change_title()}
        description={`${m.team_confirm_role_change_desc()} ${pendingRoleChangeTarget?.publicUserData?.identifier || ""}`.trim()}
        onConfirm={() => {
          if (pendingRoleChange) {
            void applyMemberRoleChange(pendingRoleChange.userId, pendingRoleChange.role);
          }
          setPendingRoleChange(null);
        }}
        confirmLabel={m.save()}
      />
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setMemberToRemove(null);
        }}
        title={m.team_confirm_remove_member_title()}
        description={`${m.team_confirm_remove_member_desc()} ${memberToRemove?.publicUserData?.identifier || ""}`.trim()}
        onConfirm={() => {
          void applyRemoveMember();
        }}
        confirmLabel={m.team_remove()}
        variant="destructive"
      />
    </DialogPrimitive.Root>
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
