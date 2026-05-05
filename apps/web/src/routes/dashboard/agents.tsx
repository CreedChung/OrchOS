import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft01Icon, ArrowRight01Icon, ChartAverageIcon, ComputerIcon, Key01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { LocalDevicesView } from "@/components/panels/LocalDevicesView";
import { api, type LocalHostPairingToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/dashboard-context";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/dashboard/agents")({
  component: DevicesPage,
});

export function DevicesPage() {
  const { localHosts, loading } = useDashboard();
  const [pairing, setPairing] = useState<LocalHostPairingToken | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"agents" | "stats" | "pairing">("agents");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);

  const onlineCount = useMemo(() => localHosts.filter((host) => host.status === "online").length, [localHosts]);
  const registeredCount = localHosts.length;
  const totalRuntimeCount = useMemo(
    () => localHosts.reduce((count, host) => count + host.runtimes.length, 0),
    [localHosts],
  );

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current !== null) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      setShowExpandedContent(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowExpandedContent(true);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [sidebarCollapsed]);

  async function handleCreatePairingToken() {
    try {
      setPairingLoading(true);
      const token = await api.createLocalHostPairingToken();
      setPairing(token);
      toast.success(m.pairing_token_generated());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.failed_create_pairing_token());
    } finally {
      setPairingLoading(false);
    }
  }

  const handleCollapseSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setShowExpandedContent(false);
    collapseTimerRef.current = window.setTimeout(() => {
      setSidebarCollapsed(true);
      collapseTimerRef.current = null;
    }, 180);
  }, []);

  const handleExpandSidebar = useCallback(() => {
    if (collapseTimerRef.current !== null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    setSidebarCollapsed(false);
  }, []);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const sidebarEl = event.currentTarget.parentElement;
    const sidebarLeft = sidebarEl?.getBoundingClientRect().left ?? 0;

    setIsResizingSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 280), 420);
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <div
        className={cn(
          "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r bg-card transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-0 border-r-transparent" : "w-[var(--agents-sidebar-width)]",
          isResizingSidebar ? "border-r-transparent" : "border-border",
        )}
        style={
          sidebarCollapsed
            ? undefined
            : ({ "--agents-sidebar-width": `${Math.min(sidebarWidth, 380)}px` } as CSSProperties)
        }
      >
        <div
          className={cn(
            "border-b border-border p-2 transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <div className="flex h-10 items-center justify-between rounded-md px-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{m.devices()}</div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="active:-translate-y-0"
                    onClick={handleCollapseSidebar}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{m.collapse_sidebar()}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col transition-[opacity,filter] duration-300 ease-out",
            showExpandedContent ? "opacity-100 blur-0" : "pointer-events-none opacity-0 blur-[6px]",
          )}
          aria-hidden={!showExpandedContent}
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-0.5 p-1.5">
              {sidebarTab === "agents" && (
                localHosts.length > 0 && (
                  localHosts.map((host) => (
                    <div key={host.id} className="group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors text-foreground/70 hover:bg-accent/50 hover:text-foreground">
                      <span className={cn("size-2 shrink-0 rounded-full", host.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                      <HugeiconsIcon icon={ComputerIcon} className="size-3.5 shrink-0 opacity-40" />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate text-xs leading-5">{host.name}</div>
                        <div className="text-[11px] leading-4 text-muted-foreground">
                          {host.status === "online" ? m.online() : m.offline()}
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {sidebarTab === "stats" && (
                <>
                  {[
                    { label: m.online(), value: onlineCount },
                    { label: m.registered(), value: registeredCount },
                    { label: m.runtimes(), value: totalRuntimeCount },
                  ].map((item) => (
                    <div key={item.label} className="group flex min-h-9 items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors text-foreground/70 hover:bg-accent/50 hover:text-foreground">
                      <div className="min-w-0 flex-1 text-left">
                        <div className="truncate text-xs leading-5">{item.label}</div>
                        <div className="text-[11px] leading-4 text-muted-foreground tabular-nums">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {sidebarTab === "pairing" && (
                <button
                  type="button"
                  onClick={() => void handleCreatePairingToken()}
                  disabled={pairingLoading}
                  className="group flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors text-foreground/70 hover:bg-accent/50 hover:text-foreground disabled:opacity-50"
                >
                  <HugeiconsIcon icon={Key01Icon} className="size-3.5 shrink-0 opacity-40" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs leading-5">
                      {pairingLoading ? m.generating_token() : pairing ? m.regenerate_pairing_token() : m.generate_pairing_token()}
                    </div>
                    <div className="text-[11px] leading-4 text-muted-foreground">
                      {m.create_short_lived_token()}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-2">
            <div className="flex h-10 items-center justify-center gap-1 rounded-md px-2">
              {[
                { id: "agents" as const, icon: ComputerIcon, iconClassName: "text-sky-500", label: "Local agents" },
                { id: "stats" as const, icon: ChartAverageIcon, iconClassName: "text-emerald-500", label: "Statistics" },
                { id: "pairing" as const, icon: Key01Icon, iconClassName: "text-amber-500", label: "Pairing" },
              ].map((tab) => (
                <Tooltip key={tab.id}>
                  <TooltipTrigger>
                    <button
                      type="button"
                      onClick={() => setSidebarTab(tab.id)}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                        sidebarTab === tab.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={tab.icon} className={cn("size-3.5", sidebarTab === tab.id ? tab.iconClassName : "")} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tab.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize agents sidebar"
          onPointerDown={handleResizeStart}
          className={cn(
            "group absolute right-[-8px] top-0 z-20 h-full w-4",
            sidebarCollapsed && "hidden",
            isResizingSidebar && "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-[repeating-linear-gradient(to_bottom,theme(colors.sky.500)_0_6px,transparent_6px_12px)]",
          )}
        >
          <div
            className={cn(
              "absolute top-1/2 left-1/2 flex h-12 w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out group-hover:bg-muted group-hover:shadow-md",
              isResizingSidebar && "border-border bg-muted shadow-md",
            )}
          >
            <div
              className={cn(
                "h-8 w-px rounded-full bg-border transition-[background-color] duration-150 ease-out group-hover:bg-foreground/35",
                isResizingSidebar && "opacity-0",
              )}
            />
          </div>
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {sidebarCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:!translate-y-[-50%]"
            onClick={handleExpandSidebar}
            title={m.expand_sidebar()}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        ) : null}
        <LocalDevicesView
          loading={loading}
          pairing={pairing}
          pairingLoading={pairingLoading}
          onCreatePairingToken={handleCreatePairingToken}
        />
      </div>
    </div>
  );
}
