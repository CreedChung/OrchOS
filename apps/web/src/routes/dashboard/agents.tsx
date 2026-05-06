import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft01Icon, ArrowRight01Icon, CancelCircleIcon, CheckmarkCircle02Icon, ComputerIcon, Copy01Icon, Delete02Icon, Edit02Icon, Tick01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "@/components/ui/toast";
import { AppDialog } from "@/components/ui/app-dialog";
import { LocalDevicesView } from "@/components/panels/LocalDevicesView";
import { api, type LocalAgentPairingToken, type CustomAgent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/dashboard-context";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/dashboard/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  const { localAgents, loading } = useDashboard();
  const [pairing, setPairing] = useState<LocalAgentPairingToken | null>(null);
  const [showPairingDialog, setShowPairingDialog] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [connectStep, setConnectStep] = useState<"choose" | "cli" | "custom">("choose");
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [agentForm, setAgentForm] = useState({ name: "", url: "", apiKey: "", model: "" });
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  useEffect(() => {
    void loadCustomAgents();
  }, []);

  async function loadCustomAgents() {
    try {
      const agents = await api.listCustomAgents();
      setCustomAgents(agents);
    } catch {}
  }
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);

  const filteredAgents = useMemo(() => {
    if (statusFilter === "all") return localAgents;
    return localAgents.filter((agent) => agent.status === statusFilter);
  }, [localAgents, statusFilter]);

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

  function handleOpenConnect() {
    setConnectStep("choose");
    setIsConnectDialogOpen(true);
  }

  function handleSelectCli() {
    setConnectStep("cli");
  }

  function handleSelectCustom(agent?: CustomAgent) {
    if (agent) {
      setEditingAgentId(agent.id);
      setAgentForm({ name: agent.name, url: agent.url, apiKey: agent.apiKey, model: agent.model });
    } else {
      setEditingAgentId(null);
      setAgentForm({ name: "", url: "", apiKey: "", model: "" });
    }
    setConnectStep("custom");
  }

  async function handleCreatePairingToken() {
    try {
      const token = await api.createLocalAgentPairingToken();
      setPairing(token);
      setIsConnectDialogOpen(false);
      setShowPairingDialog(true);
      setTokenCopied(false);
      toast.success(m.pairing_token_generated());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.failed_create_pairing_token());
    }
  }

  async function handleSaveCustomAgent() {
    const { name, url, apiKey, model } = agentForm;
    if (!name.trim() || !url.trim() || !apiKey.trim() || !model.trim()) {
      toast.error("All fields are required");
      return;
    }
    try {
      const agents = editingAgentId
        ? await api.updateCustomAgent(editingAgentId, { name: name.trim(), url: url.trim(), apiKey: apiKey.trim(), model: model.trim() })
        : await api.createCustomAgent({ name: name.trim(), url: url.trim(), apiKey: apiKey.trim(), model: model.trim() });
      setCustomAgents(agents);
      setEditingAgentId(null);
      setIsConnectDialogOpen(false);
      toast.success(editingAgentId ? "Custom agent updated" : "Custom agent created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save custom agent");
    }
  }

  async function handleCopyToken(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
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
      const nextWidth = Math.min(Math.max(moveEvent.clientX - sidebarLeft, 200), 420);
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
              <div className="text-sm font-semibold text-foreground">{m.agents()} <span className="ml-1 text-xs font-normal text-muted-foreground tabular-nums">{localAgents.length + customAgents.length}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={<Button
                    variant="ghost"
                    size="icon-sm"
                    className="active:-translate-y-0"
                    onClick={handleCollapseSidebar}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                  </Button>}
                />
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
              {customAgents.map((agent) => (
                <div key={agent.id} className="group flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors text-foreground/70 hover:bg-accent/50 hover:text-foreground">
                  <HugeiconsIcon icon={Settings01Icon} className="size-3.5 shrink-0 opacity-40" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs leading-5">{agent.name}</div>
                    <div className="text-[11px] leading-4 text-muted-foreground">{agent.model}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCustom(agent);
                      setIsConnectDialogOpen(true);
                    }}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                  >
                    <HugeiconsIcon icon={Edit02Icon} className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const agents = await api.deleteCustomAgent(agent.id);
                        setCustomAgents(agents);
                        toast.success("Agent removed");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to remove agent");
                      }
                    }}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                  </button>
                </div>
              ))}
              {localAgents.length > 0 && (
                <div className={cn("px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider", customAgents.length > 0 && "mt-2")}>CLI</div>
              )}
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="group flex min-h-9 cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors text-foreground/70 hover:bg-accent/50 hover:text-foreground">
                  <span className={cn("size-2 shrink-0 rounded-full", agent.status === "online" ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                  <HugeiconsIcon icon={ComputerIcon} className="size-3.5 shrink-0 opacity-40" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-xs leading-5">{agent.name}</div>
                    <div className="text-[11px] leading-4 text-muted-foreground">
                      {agent.status === "online" ? m.online() : m.offline()}
                    </div>
                  </div>
                </div>
              ))}
              {customAgents.length === 0 && filteredAgents.length === 0 && (
                <div className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                  {m.no_devices_paired()}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-2">
            <div className="flex h-10 items-center justify-center gap-1 rounded-md px-2">
              {[
                { id: "all" as const, icon: ComputerIcon, iconClassName: "text-sky-500", label: m.all() },
                { id: "online" as const, icon: CheckmarkCircle02Icon, iconClassName: "text-emerald-500", label: m.online() },
                { id: "offline" as const, icon: CancelCircleIcon, iconClassName: "text-muted-foreground/50", label: m.offline() },
              ].map((tab) => (
                <Tooltip key={tab.id}>
                  <TooltipTrigger
                    render={<button
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-md transition-colors",
                        statusFilter === tab.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <HugeiconsIcon icon={tab.icon} className={cn("size-3.5", statusFilter === tab.id ? tab.iconClassName : "text-muted-foreground/40")} />
                    </button>}
                  />
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
          onConnectClick={handleOpenConnect}
        />
      </div>

      <AppDialog
        open={isConnectDialogOpen}
        onOpenChange={(open) => {
          if (!open) setConnectStep("choose");
          setIsConnectDialogOpen(open);
        }}
        title={connectStep === "choose" ? "Connect agent" : connectStep === "cli" ? "Connect via CLI" : editingAgentId ? "Edit agent" : "Custom configuration"}
        size="sm"
        bodyClassName={connectStep === "choose" ? "flex items-center" : undefined}
        footer={
          connectStep === "choose" ? (
            <Button type="button" variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
              Cancel
            </Button>
          ) : connectStep === "cli" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConnectStep("choose")}>
                Back
              </Button>
              <Button type="button" onClick={handleCreatePairingToken}>
                Generate token
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setConnectStep("choose")}>
                Back
              </Button>
              <Button type="button" onClick={handleSaveCustomAgent}>
                Save
              </Button>
            </>
          )
        }
      >
        {connectStep === "choose" ? (
          <div className="grid w-full gap-3">
            <button
              type="button"
              onClick={handleSelectCli}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={ComputerIcon} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">Connect via CLI</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Pair a local agent by running a CLI command with a pairing token.
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectCustom()}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-4 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={Settings01Icon} className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">Custom configuration</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Configure a custom agent with URL, API key, and model name.
                </div>
              </div>
            </button>
          </div>
        ) : connectStep === "cli" ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate a pairing token and run the CLI command for the local agent you want to connect.
            </p>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/50 p-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HugeiconsIcon icon={ComputerIcon} className="size-6" />
              </div>
              <div className="text-sm text-foreground">
                Install the CLI for your local agent and run the command with the generated token to pair it.
              </div>
            </div>
          </div>
        ) : connectStep === "custom" ? (
          <div className="space-y-4">
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Name</span>
              <input
                value={agentForm.name}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="My Agent"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">URL</span>
              <input
                value={agentForm.url}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://my-agent.example.com"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">API Key</span>
              <input
                value={agentForm.apiKey}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Model</span>
              <input
                value={agentForm.model}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="gpt-4o"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
        ) : null}
      </AppDialog>

      <AppDialog
        open={showPairingDialog}
        onOpenChange={setShowPairingDialog}
        title={m.pairing_token_title()}
        description={m.pairing_token_desc()}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {pairing ? m.token_expires_in({ minutes: String(Math.max(1, Math.round((new Date(pairing.expiresAt).getTime() - Date.now()) / 60000))) }) : ""}
            </span>
            <Button type="button" variant="default" onClick={() => setShowPairingDialog(false)}>
              {m.done()}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{m.pairing_token_instructions()}</p>

          <div className="relative">
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-muted p-4 font-mono text-xs text-foreground">
              ORCHOS_CLOUD_API_URL=&quot;$YOUR_APP_URL&quot; \
              ORCHOS_CLOUD_PAIRING_TOKEN={pairing?.pairingToken ?? ""} \
              bunx @orchos/cli
            </pre>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground select-all">
              {pairing?.pairingToken ?? ""}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (pairing?.pairingToken) {
                  void handleCopyToken(pairing.pairingToken);
                }
              }}
            >
              <HugeiconsIcon icon={tokenCopied ? Tick01Icon : Copy01Icon} className="size-3.5" />
              <span className="ml-1.5">{tokenCopied ? m.token_copied() : m.copy_token()}</span>
            </Button>
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
