import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Alert01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { m } from "@/paraglide/messages";
import { api, type ObservabilityMetrics, type TimeSeriesPoint } from "@/lib/api";
import type { Problem, RuntimeProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ObservabilityViewProps {
  runtimes: RuntimeProfile[];
  problems: Problem[];
}

type TimeRange = "24h" | "7d" | "30d";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: IconSvgElement;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
            {sub ? <span className="text-[10px] text-muted-foreground">{sub}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const throughputChartConfig = {
  operations: { label: "Operations", color: "var(--chart-1)" },
  successes: { label: "Successes", color: "var(--chart-2)" },
} satisfies ChartConfig;

const runtimeStatusChartConfig = {
  active: { label: "Active", color: "var(--chart-2)" },
  idle: { label: "Idle", color: "var(--chart-1)" },
  error: { label: "Error", color: "var(--chart-5)" },
} satisfies ChartConfig;

const AGENT_STATUS_COLORS = ["var(--chart-2)", "var(--chart-1)", "var(--chart-5)"];

export function ObservabilityView({ runtimes, problems }: ObservabilityViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [throughputApiData, setThroughputApiData] = useState<TimeSeriesPoint[]>([]);
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);

  useEffect(() => {
    api.getObservabilityThroughput(timeRange).then(setThroughputApiData).catch(console.error);
    api.getObservabilityMetrics(timeRange).then(setMetrics).catch(console.error);
  }, [timeRange]);

  const activeRuntimes = runtimes.filter((runtime) => runtime.status === "active").length;
  const idleRuntimes = runtimes.filter((runtime) => runtime.status === "idle").length;
  const errorRuntimes = runtimes.filter((runtime) => runtime.status === "error").length;
  const openProblems = problems.filter((p) => p.status === "open").length;

  const throughputData = useMemo(() => throughputApiData, [throughputApiData]);

  const runtimeStatusData = useMemo(
    () => [
      { name: "Active", value: activeRuntimes, fill: AGENT_STATUS_COLORS[0] },
      { name: "Idle", value: idleRuntimes, fill: AGENT_STATUS_COLORS[1] },
      { name: "Error", value: errorRuntimes, fill: AGENT_STATUS_COLORS[2] },
    ],
    [activeRuntimes, idleRuntimes, errorRuntimes],
  );

  const errorRate = useMemo(() => {
    if (problems.length === 0) return "0%";
    const errors = problems.filter((p) => p.priority === "critical").length;
    return `${((errors / problems.length) * 100).toFixed(1)}%`;
  }, [problems]);

  const totalOperations = throughputData.reduce((sum, item) => sum + item.operations, 0);
  const totalSuccesses = throughputData.reduce((sum, item) => sum + item.successes, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{m.observability()}</h1>
            <p className="text-sm text-muted-foreground">{m.observability_desc()}</p>
          </div>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="24h">{m.obs_last_24h()}</TabsTrigger>
              <TabsTrigger value="7d">{m.obs_last_7d()}</TabsTrigger>
              <TabsTrigger value="30d">{m.obs_last_30d()}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={Target01Icon} label={m.obs_operations()} value={totalOperations} />
          <MetricCard icon={CheckmarkCircle01Icon} label={m.obs_success()} value={totalSuccesses} />
          <MetricCard icon={Alert01Icon} label={m.obs_error_rate()} value={problems.length > 0 ? errorRate : "—"} />
          <MetricCard
            icon={Clock01Icon}
            label={m.obs_avg_response()}
            value={metrics ? `${metrics.runtime.avgLatencyMs.toFixed(0)}ms` : "—"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Runtime Health</CardTitle>
              <CardDescription className="text-xs">Connected runtime fleet overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Connected runtimes</span>
                <span className="font-medium">{runtimes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active runtimes</span>
                <span className="font-medium">{activeRuntimes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Open alerts</span>
                <span className="font-medium">{openProblems}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Problem Feed</CardTitle>
              <CardDescription className="text-xs">Recent issues that still need attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {problems.slice(0, 3).map((problem) => (
                <div key={problem.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {problem.priority}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {new Date(problem.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{problem.title}</p>
                </div>
              ))}
              {problems.length === 0 ? (
                <div className="text-sm text-muted-foreground">No active problems detected.</div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">{m.obs_throughput_24h()}</CardTitle>
              <CardDescription className="text-xs">{m.obs_operations()}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer config={throughputChartConfig} className="h-[240px] w-full">
                <BarChart data={throughputData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="operations" fill="var(--color-operations)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="successes" fill="var(--color-successes)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{m.obs_agent_status()}</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer config={runtimeStatusChartConfig} className="h-[200px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={runtimeStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {runtimeStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGENT_STATUS_COLORS[0] }} />
                  {m.obs_active_agents({ count: activeRuntimes })}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ backgroundColor: AGENT_STATUS_COLORS[1] }} />
                  {m.obs_idle_agents({ count: idleRuntimes })}
                </span>
                {errorRuntimes > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: AGENT_STATUS_COLORS[2] }} />
                    {m.obs_error_agents({ count: errorRuntimes })}
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {openProblems > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{m.obs_recent_events()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {problems
                  .filter((p) => p.status === "open")
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2">
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          p.priority === "critical"
                            ? "bg-red-500"
                            : p.priority === "warning"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <span className="flex-1 truncate text-sm text-foreground">{p.title}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {p.priority}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
