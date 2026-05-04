import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Copy01Icon,
  Key01Icon,
  LinkSquare02Icon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LocalHostPairingToken, LocalHostProfile } from "@/lib/api";

interface LocalDevicesViewProps {
  hosts: LocalHostProfile[];
  loading: boolean;
  pairing: LocalHostPairingToken | null;
  pairingLoading: boolean;
  onCreatePairingToken: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

function formatRelativeTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes === 1) return "1 min ago";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} days ago`;
}

function getPairingCommand(token: string) {
  return [
    `ORCHOS_CLOUD_API_URL=${typeof window === "undefined" ? "http://127.0.0.1:5173" : window.location.origin}`,
    `ORCHOS_CLOUD_PAIRING_TOKEN=${token}`,
    `bun run dev:cli`,
  ].join(" \\\n");
}

export function LocalDevicesView({
  hosts,
  loading,
  pairing,
  pairingLoading,
  onCreatePairingToken,
  onRefresh,
}: LocalDevicesViewProps) {
  const [query, setQuery] = useState("");

  const filteredHosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return hosts;

    return hosts.filter((host) =>
      [host.name, host.deviceId, host.platform, ...host.runtimes.map((runtime) => runtime.name)]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [hosts, query]);

  const onlineCount = hosts.filter((host) => host.status === "online").length;
  const totalRuntimeCount = hosts.reduce((count, host) => count + host.runtimes.length, 0);
  const pairingCommand = pairing ? getPairingCommand(pairing.pairingToken) : "";

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-2xl shadow-[0_1px_1px_rgba(0,0,0,0.03),0_18px_40px_rgba(0,0,0,0.06)]">
            <CardHeader className="gap-3">
              <div className="space-y-2">
                <Badge variant="outline" className="h-6 rounded-full px-2.5 text-[11px] font-medium uppercase tracking-[0.16em]">
                  Local bridge
                </Badge>
                <CardTitle className="text-2xl [text-wrap:balance]">Connect a local device</CardTitle>
                <CardDescription className="max-w-2xl leading-6 [text-wrap:pretty]">
                  Pair any machine running the OrchOS local CLI host, then keep its local runtimes visible inside your web workspace.
                </CardDescription>
              </div>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => void onRefresh()}>
                  <HugeiconsIcon icon={RefreshIcon} className="size-3.5" />
                  Refresh
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[{ label: "Online devices", value: onlineCount }, { label: "Registered devices", value: hosts.length }, { label: "Detected runtimes", value: totalRuntimeCount }].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-muted/35 p-3 ring-1 ring-foreground/6">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">{stat.value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-[0_1px_1px_rgba(0,0,0,0.03),0_18px_40px_rgba(0,0,0,0.06)]">
            <CardHeader>
              <CardTitle className="text-base">Pairing token</CardTitle>
              <CardDescription className="leading-6 [text-wrap:pretty]">
                Generate a short-lived one-time token from the browser, then exchange it for a device-scoped host token on the local machine.
              </CardDescription>
              <CardAction>
                <Button size="sm" onClick={() => void onCreatePairingToken()} disabled={pairingLoading}>
                  <HugeiconsIcon icon={Key01Icon} className="size-3.5" />
                  {pairingLoading ? "Generating..." : pairing ? "Regenerate" : "Generate"}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {pairing ? (
                <>
                  <div className="rounded-xl bg-muted/35 p-3 ring-1 ring-foreground/6">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Token</div>
                    <div className="mt-2 break-all font-mono text-sm">{pairing.pairingToken}</div>
                    <div className="mt-2 text-xs text-muted-foreground">Expires {formatRelativeTime(pairing.expiresAt)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={async () => {
                      await navigator.clipboard.writeText(pairing.pairingToken);
                      toast.success("Pairing token copied");
                    }}>
                      <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
                      Copy token
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      await navigator.clipboard.writeText(pairingCommand);
                      toast.success("Pairing command copied");
                    }}>
                      <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" />
                      Copy command
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground [text-wrap:pretty]">
                  Generate a token to reveal the one-time pairing command.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-2xl shadow-[0_1px_1px_rgba(0,0,0,0.03),0_18px_40px_rgba(0,0,0,0.06)]">
            <CardHeader>
              <CardTitle className="text-base">Pairing instructions</CardTitle>
              <CardDescription className="leading-6 [text-wrap:pretty]">
                Run the local CLI host on the target machine and let it exchange the one-time browser token for a persistent host credential.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "Generate a pairing token in this page.",
                "Open a terminal on the machine you want to connect.",
                "Paste the generated command and keep the host process running.",
                "Come back here to verify the machine shows up online with its local runtimes.",
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-3 rounded-xl bg-muted/30 p-3 ring-1 ring-foreground/6">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold ring-1 ring-foreground/8 tabular-nums">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 [text-wrap:pretty]">{step}</p>
                </div>
              ))}

              <div className="rounded-2xl bg-[#0d1117] p-4 text-white ring-1 ring-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/40">CLI command</div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[13px] leading-6 text-white/88">
                  {pairing ? pairingCommand : "Generate a pairing token to reveal the command."}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-[0_1px_1px_rgba(0,0,0,0.03),0_18px_40px_rgba(0,0,0,0.06)]">
            <CardHeader>
              <CardTitle className="text-base">Connected devices</CardTitle>
              <CardDescription className="leading-6 [text-wrap:pretty]">
                Each paired host reports its availability and runtime inventory back into your OrchOS workspace.
              </CardDescription>
              <CardAction>
                <div className="relative w-56">
                  <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search devices or runtimes" className="h-9 pl-8" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground">Loading connected devices...</div>
              ) : filteredHosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                  <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-muted/35 ring-1 ring-foreground/6">
                    <HugeiconsIcon icon={ComputerIcon} className="size-5" />
                  </div>
                  <div className="font-medium text-foreground">No devices paired yet</div>
                  <p className="mt-1 [text-wrap:pretty]">Generate a pairing token above, then start the CLI host on a local machine.</p>
                </div>
              ) : (
                filteredHosts.map((host) => (
                  <div key={host.id} className="rounded-2xl bg-muted/25 p-4 ring-1 ring-foreground/6 transition-[transform,box-shadow,background-color] hover:-translate-y-px hover:bg-muted/35 hover:shadow-[0_14px_28px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-2xl bg-background ring-1 ring-foreground/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                            <HugeiconsIcon icon={ComputerIcon} className="size-4 text-foreground/80" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-sm font-semibold text-foreground">{host.name}</h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 font-medium",
                                  host.status === "online"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "border-border/70 bg-muted text-muted-foreground",
                                )}
                              >
                                {host.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground tabular-nums">{host.deviceId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{host.platform || "Unknown platform"}</div>
                        <div className="tabular-nums">Seen {formatRelativeTime(host.lastSeenAt)}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {host.runtimes.length > 0 ? host.runtimes.map((runtime) => (
                        <div key={`${host.id}-${runtime.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-background px-3 py-2 text-xs ring-1 ring-foreground/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          <span className="flex size-5 items-center justify-center rounded-full bg-muted/60 text-[10px] font-semibold">{runtime.name.charAt(0).toUpperCase()}</span>
                          <span className="font-medium text-foreground">{runtime.name}</span>
                          {runtime.version ? <span className="text-muted-foreground tabular-nums">v{runtime.version}</span> : null}
                        </div>
                      )) : (
                        <div className="inline-flex min-h-10 items-center rounded-full bg-background px-3 py-2 text-xs text-muted-foreground ring-1 ring-foreground/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          No runtimes reported yet
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/6">
          <span className="[text-wrap:pretty]">You can still use the quick local runtime scan inside Settings for manual inspection and registration.</span>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/creation">Back to workspace</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
