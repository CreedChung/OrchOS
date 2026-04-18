import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton, useUser, useClerk } from "@clerk/clerk-react";
import { cn } from "#/lib/utils";
import { ScrollArea } from "#/components/ui/scroll-area";
import {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardContent,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
} from "#/components/ui/info-card";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  InboxIcon,
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
  Archive01Icon,
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
} from "#/components/ui/dropdown-menu";
import { RenameDialog } from "#/components/dialogs/RenameDialog";
import { ConfirmDialog } from "#/components/ui/confirm-dialog";
import { m } from "#/paraglide/messages";
import type { Organization, Problem, SidebarView } from "#/lib/types";
import { isInboxItem } from "#/lib/types";

interface SidebarSection {
  label: string;
  items: {
    id: SidebarView;
    to: string;
    icon: IconSvgElement;
    label: string;
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
  const openInboxCount = problems.filter((p) => p.status === "open" && isInboxItem(p)).length;
  const criticalCount = problems.filter(
    (p) => p.status === "open" && isInboxItem(p) && p.priority === "critical",
  ).length;

  const sections: SidebarSection[] = [
    {
      label: m.workspace(),
      items: [
        {
          id: "inbox",
          to: "/dashboard/inbox",
          icon: InboxIcon,
          label: m.inbox(),
          badge: openInboxCount,
          badgeCritical: criticalCount > 0,
        },
        { id: "goals", to: "/dashboard/goals", icon: Target01Icon, label: m.goals() },
        { id: "creation", to: "/dashboard/creation", icon: Chat01Icon, label: m.creation() },
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
      label: m.environments(),
      items: [
        {
          id: "environments",
          to: "/dashboard/environments",
          icon: Archive01Icon,
          label: m.environments(),
        },
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
        <div className="p-2 space-y-1">
          {sections.map((section, si) => (
            <div key={si} className="space-y-0.5">
              <span className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.label}
              </span>
              {section.items.map(({ id, to, icon: Icon, label, badge, badgeCritical }) => {
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
              })}
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
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const isClerkConfigured = !!(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim());

  if (!isClerkConfigured || !isLoaded) {
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
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">U</div>
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

  return (
    <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
      <UserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            avatarBox: "size-6",
          },
        }}
      />
      <span className="flex-1 truncate text-sm text-sidebar-foreground/70">
        {user.fullName || user.username || m.user()}
      </span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="shrink-0">
          <HugeiconsIcon icon={ChevronUp} className="size-3 opacity-50 text-sidebar-foreground/70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="min-w-48 mb-1">
          <DropdownMenuItem onClick={onOpenSettings}>
            <HugeiconsIcon icon={Settings02Icon} className="size-3.5" />
            {m.settings()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
            <HugeiconsIcon icon={Logout03Icon} className="size-3.5" />
            {m.log_out()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
