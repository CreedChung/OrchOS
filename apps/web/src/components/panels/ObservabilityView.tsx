import { useState, useMemo, useEffect } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Target01Icon,
  Alert01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import { m } from "@/paraglide/messages";
import {
  api,
  type TimeSeriesPoint,
  type GoalTimeSeriesPoint,
  type ExecutionGraphSummary,
  type ObservabilityMetrics,
  type ReflectionRecord,
} from "@/lib/api";
import type { Goal, Problem, RuntimeProfile } from "@/lib/types";

interface ObservabilityViewProps {
  runtimes: RuntimeProfile[];
  goals: Goal[];
  problems: Problem[];
}

type TimeRange = "24h" | "7d" | "30d";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
}: {
  icon: IconSvgElement;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Icon} className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums text-foreground">{value}</span>
            {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
            {trend === "up" && (
              <span className="text-[10px] font-medium text-emerald-500">&#9650;</span>
            )}
            {trend === "down" && (
              <span className="text-[10px] font-medium text-red-500">&#9660;</span>
            )}
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

const goalRateChartConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  active: { label: "Active", color: "var(--chart-3)" },
} satisfies ChartConfig;

const agentStatusChartConfig = {
  active: { label: "Active", color: "var(--chart-2)" },
  idle: { label: "Idle", color: "var(--chart-1)" },
  error: { label: "Error", color: "var(--chart-5)" },
} satisfies ChartConfig;

const operationsPieConfig = {
  success: { label: "Success", color: "var(--chart-2)" },
  failures: { label: "Failures", color: "var(--chart-5)" },
  pending: { label: "Pending", color: "var(--chart-1)" },
} satisfies ChartConfig;

const AGENT_STATUS_COLORS = ["var(--chart-2)", "var(--chart-1)", "var(--chart-5)"];
const OPS_PIE_COLORS = ["var(--chart-2)", "var(--chart-5)", "var(--chart-1)"];

export function ObservabilityView({ runtimes, goals, problems }: ObservabilityViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [throughputApiData, setThroughputApiData] = useState<TimeSeriesPoint[]>([]);
  const [goalApiData, setGoalApiData] = useState<GoalTimeSeriesPoint[]>([]);
  const [metrics, setMetrics] = useState<ObservabilityMetrics | null>(null);
  const [graphSummaries, setGraphSummaries] = useState<ExecutionGraphSummary[]>([]);
  const [reflections, setReflections] = useState<ReflectionRecord[]>([]);

  useEffect(() => {
    api.getObservabilityThroughput(timeRange).then(setThroughputApiData).catch(console.error);
    api.getObservabilityGoals(timeRange).then(setGoalApiData).catch(console.error);
    api.getObservabilityMetrics(timeRange).then(setMetrics).catch(console.error);
    api.getObservabilityGraphs().then(setGraphSummaries).catch(console.error);
    api.listReflections().then(setReflections).catch(console.error);
  }, [timeRange]);

  const activeAgents = runtimes.filter((runtime) => runtime.status === "active").length;
  const idleAgents = runtimes.filter((runtime) => runtime.status === "idle").length;
  const errorAgents = runtimes.filter((runtime) => runtime.status === "error").length;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const openProblems = problems.filter((p) => p.status === "open").length;

  const throughputData = useMemo(() => throughputApiData, [throughputApiData]);
  const goalData = useMemo(() => goalApiData, [goalApiData]);

  const agentStatusData = useMemo(
    () => [
      { name: "Active", value: activeAgents, fill: AGENT_STATUS_COLORS[0] },
      { name: "Idle", value: idleAgents, fill: AGENT_STATUS_COLORS[1] },
      { name: "Error", value: errorAgents, fill: AGENT_STATUS_COLORS[2] },
    ],
    [activeAgents, idleAgents, errorAgents],
  );

  const operationsData = useMemo(() => {
    const totalOps = goals.length * 5;
    const successOps = Math.floor(totalOps * 0.78);
    const failOps = Math.floor(totalOps * 0.07);
    const pendingOps = totalOps - successOps - failOps;
    return [
      { name: "Success", value: successOps, fill: OPS_PIE_COLORS[0] },
      { name: "Failures", value: failOps, fill: OPS_PIE_COLORS[1] },
      { name: "Pending", value: pendingOps, fill: OPS_PIE_COLORS[2] },
    ];
  }, [goals.length]);

  const errorRate = useMemo(() => {
    if (problems.length === 0) return "0%";
    const errors = problems.filter((p) => p.priority === "critical").length;
    return `${((errors / problems.length) * 100).toFixed(1)}%`;
  }, [problems]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Header */}
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

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            icon={Target01Icon}
            label={m.obs_active_goals()}
            value={activeGoals}
            trend={activeGoals > 0 ? "up" : "flat"}
          />
          <MetricCard
            icon={CheckmarkCircle01Icon}
            label={m.obs_goals_completed()}
            value={completedGoals}
            trend="up"
          />
          <MetricCard
            icon={Alert01Icon}
            label={m.obs_error_rate()}
            value={activeGoals > 0 || completedGoals > 0 ? errorRate : "—"}
            trend={
              errorRate === "0%"
                ? "flat"
                : errorRate !== "0%" && problems.length > 0
                  ? "down"
                  : "flat"
            }
          />
          <MetricCard
            icon={Clock01Icon}
            label={m.obs_avg_response()}
            value={metrics ? `${metrics.runtime.avgLatencyMs.toFixed(0)}ms` : "—"}
            trend="down"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Execution Graphs</CardTitle>
              <CardDescription className="text-xs">Persisted runs and replay coverage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Graphs tracked</span>
                <span className="font-medium">{metrics?.graphs.total ?? graphSummaries.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Replays available</span>
                <span className="font-medium">{graphSummaries.filter((graph) => Boolean(graph.contextSnapshotId)).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mean graph latency</span>
                <span className="font-medium">
                  {graphSummaries.length > 0
                    ? `${(
                        graphSummaries.reduce((sum, graph) => sum + graph.avgLatencyMs, 0) /
                        graphSummaries.length
                      ).toFixed(0)}ms`
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Runtime Cost</CardTitle>
              <CardDescription className="text-xs">Attempt-level estimates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Avg latency</span>
                <span className="font-medium">{metrics ? `${metrics.runtime.avgLatencyMs.toFixed(0)}ms` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-medium">{metrics ? `$${metrics.runtime.totalCostUsd.toFixed(4)}` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Attempt traces</span>
                <span className="font-medium">{graphSummaries.reduce((sum, graph) => sum + graph.attemptCount, 0)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reflection Feed</CardTitle>
              <CardDescription className="text-xs">Failure clustering and degraded paths</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reflections.slice(0, 3).map((reflection) => (
                <div key={reflection.id} className="rounded-lg border border-border/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {reflection.kind}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {new Date(reflection.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground line-clamp-2">{reflection.summary}</p>
                </div>
              ))}
              {reflections.length === 0 && (
                <div className="text-sm text-muted-foreground">No reflection artifacts captured yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Throughput Chart + Agent Status Pie */}
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
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="operations"
                    fill="var(--color-operations)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="successes"
                    fill="var(--color-successes)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{m.obs_agent_status()}</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer config={agentStatusChartConfig} className="h-[200px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={agentStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {agentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: AGENT_STATUS_COLORS[0] }}
                  />
                  {m.obs_active_agents({ count: activeAgents })}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: AGENT_STATUS_COLORS[1] }}
                  />
                  {m.obs_idle_agents({ count: idleAgents })}
                </span>
                {errorAgents > 0 && (
                  <span className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: AGENT_STATUS_COLORS[2] }}
                    />
                    {m.obs_error_agents({ count: errorAgents })}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goal Completion Rate Area Chart + Operations Pie */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">{m.obs_goal_completion_rate()}</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer config={goalRateChartConfig} className="h-[240px] w-full">
                <AreaChart data={goalData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-active)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-active)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={10} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="var(--color-completed)"
                    fill="url(#fillCompleted)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="var(--color-active)"
                    fill="url(#fillActive)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{m.obs_operations()}</CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ChartContainer config={operationsPieConfig} className="h-[200px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={operationsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {operationsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: OPS_PIE_COLORS[0] }}
                  />
                  {m.obs_success()}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: OPS_PIE_COLORS[1] }}
                  />
                  {m.obs_failures()}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: OPS_PIE_COLORS[2] }}
                  />
                  {m.obs_pending()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events / Problems */}
        {openProblems > 0 && (
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
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2"
                    >
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          p.priority === "critical"
                            ? "bg-red-500"
                            : p.priority === "warning"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <span className="flex-1 text-sm text-foreground truncate">{p.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {p.priority}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
