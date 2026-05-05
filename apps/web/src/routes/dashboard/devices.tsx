import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft01Icon, ArrowRight01Icon, ComputerIcon, Key01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";
import { LocalDevicesView } from "@/components/panels/LocalDevicesView";
import { api, type LocalHostPairingToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/dashboard-context";

export const Route = createFileRoute("/dashboard/devices")({
  component: DevicesPage,
});

export function DevicesPage() {
  const { localHosts, refreshLocalHosts, loading } = useDashboard();
  const [pairing, setPairing] = useState<LocalHostPairingToken | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
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
      toast.success("Pairing token generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create pairing token");
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
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 240), 380);
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
          "relative hidden min-h-0 shrink-0 flex-col overflow-visible border-r border-border bg-card transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-0 border-r-transparent" : "w-[var(--agents-sidebar-width)]",
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
            <div className="text-sm font-semibold text-foreground">Agents</div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="active:-translate-y-0"
              onClick={handleCollapseSidebar}
              title="Collapse sidebar"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            </Button>
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
            <div className="space-y-5 p-3">
              <section className="space-y-2">
                <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Local agents
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HugeiconsIcon icon={ComputerIcon} className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">Connected hosts</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {registeredCount} registered, {onlineCount} online
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Quick stats
                </div>
                <div className="grid gap-2">
                  {[
                    { label: "Online", value: onlineCount },
                    { label: "Registered", value: registeredCount },
                    { label: "Runtimes", value: totalRuntimeCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
                      <div className="text-[11px] text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="px-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Pairing
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreatePairingToken()}
                  disabled={pairingLoading}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <HugeiconsIcon icon={Key01Icon} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {pairingLoading ? "Generating token..." : pairing ? "Regenerate pairing token" : "Generate pairing token"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Create a short-lived token for a local CLI host.
                    </div>
                  </div>
                </button>
              </section>
            </div>
          </ScrollArea>

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

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {sidebarCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 left-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-card shadow-sm active:translate-x-[calc(-50%+2px)] active:translate-y-0"
            onClick={handleExpandSidebar}
            title="Expand sidebar"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        ) : null}
        <LocalDevicesView
          hosts={localHosts}
          loading={loading}
          pairing={pairing}
          pairingLoading={pairingLoading}
          onCreatePairingToken={handleCreatePairingToken}
          onRefresh={refreshLocalHosts}
        />
      </div>
    </div>
  );
}
