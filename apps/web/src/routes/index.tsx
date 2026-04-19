import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { m } from "@/paraglide/messages";
import { I18nProvider, useLocale } from "@/lib/useI18n";
import { FeaturesBento } from "@/components/ui/features-bento";
import { FloatingIconsHero } from "@/components/ui/floating-icons-hero-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AppWindow,
  BellRing,
  Blocks,
  Bot,
  Cable,
  Cloud,
  Command,
  DatabaseZap,
  GitBranch,
  GitPullRequest,
  KanbanSquare,
  MessageSquareMore,
  ShieldAlert,
  Sparkles,
  Workflow,
  ChevronRight,
  CircleDot,
  FolderOpen,
  Monitor,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: HomePage });

const integrationHeroIcons = [
  { id: 1, icon: GitPullRequest, className: "left-[8%] top-[12%]" },
  { id: 2, icon: MessageSquareMore, className: "right-[10%] top-[18%]" },
  { id: 3, icon: KanbanSquare, className: "bottom-[14%] left-[12%]" },
  { id: 4, icon: ShieldAlert, className: "bottom-[10%] right-[12%]" },
  { id: 5, icon: GitBranch, className: "left-[24%] top-[8%]" },
  { id: 6, icon: Workflow, className: "right-[27%] top-[8%]" },
  { id: 7, icon: Bot, className: "left-[20%] top-[58%]" },
  { id: 8, icon: DatabaseZap, className: "left-[35%] top-[26%]" },
  { id: 9, icon: Cloud, className: "right-[20%] top-[62%]" },
  { id: 10, icon: BellRing, className: "left-[68%] bottom-[8%]" },
  { id: 11, icon: Command, className: "right-[6%] top-[52%]" },
  { id: 12, icon: Cable, className: "left-[6%] top-[68%]" },
  { id: 13, icon: Blocks, className: "left-[52%] top-[10%]" },
  { id: 14, icon: AppWindow, className: "right-[40%] bottom-[10%]" },
  { id: 15, icon: Sparkles, className: "right-[32%] top-[32%]" },
];

function HomePageInner() {
  const { locale } = useLocale();

  const heroCopy =
    locale === "zh-CN"
      ? {
          line1: "从智能体到",
          line2: "自动化。",
          subtitle: "编排、协同并扩展你的 AI 劳动力。",
        }
      : locale === "zh-TW"
        ? {
            line1: "從智能體到",
            line2: "自動化。",
            subtitle: "編排、協調並擴展你的 AI 勞動力。",
          }
        : {
            line1: "From Agents to",
            line2: "Automation.",
            subtitle: "Orchestrate, coordinate, and scale your AI workforce.",
          };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex h-screen -mt-14 items-start justify-center overflow-hidden px-6 pt-14 sm:px-10 lg:px-14">
          <div className="absolute inset-0 z-0">
            <img src="/background.png" alt="" className="size-full object-cover" />
          </div>
          <div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-start pt-16 text-left sm:pt-20 lg:pt-24">
            <p
              className="mb-3 max-w-3xl font-serif leading-tight text-white"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)" }}
            >
              {locale === "en" ? (
                <>
                  From <span className="italic">Agents</span> to
                </>
              ) : (
                heroCopy.line1
              )}
              <br />
              <span className="text-primary italic">{heroCopy.line2}</span>
            </p>
            <p className="mb-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              {heroCopy.subtitle}
            </p>
            <div className="flex flex-wrap items-center justify-start gap-3">
              <Button asChild className="h-auto rounded-2xl px-6 py-3 shadow-sm">
                <Link to="/dashboard">{m.open_dashboard()}</Link>
              </Button>
            </div>

            <div className="group mt-auto h-[180px] w-full self-center overflow-hidden rounded-t-md border-x border-t border-white/10 bg-black/20 shadow-2xl transition-[height] duration-300 ease-out backdrop-blur-sm hover:h-[260px] sm:h-[220px] sm:hover:h-[320px] lg:h-[260px] lg:hover:h-[400px]">
              <img
                src="/hero.png"
                alt="OrchOS Hero"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <FeaturesBento />

        {/* How it works - Interactive Steps */}
        <section className="border-t border-border flex items-center overflow-hidden p-6 sm:p-10 lg:p-14" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
          <div className="grid w-full rounded-2xl bg-card shadow-sm ring-1 ring-foreground/10 overflow-hidden lg:grid-cols-2">
            <div className="flex flex-col justify-center px-8 py-16 sm:px-12 lg:px-16 lg:py-20">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
                {m.section_how_it_works()}
              </p>
              <h2 className="mb-10 text-3xl font-bold text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                {m.how_it_works_heading()}
              </h2>

              <HowItWorksSteps />
            </div>

            <div className="relative flex items-center justify-center px-6 py-12 lg:px-10 lg:py-16">
              <div className="absolute inset-0">
                <img src="/gradients-background.png" alt="" className="size-full object-cover" />
              </div>
              <div className="relative w-full max-w-2xl">
                <DashboardMockWindow />
              </div>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <FloatingIconsHero
          className="border-t border-border bg-card/40"
          style={{ minHeight: 'calc(100vh - 3.5rem)' }}
          eyebrow={m.section_integrations()}
          title={m.integrations_heading()}
          subtitle={m.connect_services_desc()}
          ctaText={m.open_dashboard()}
          ctaHref="/dashboard"
          icons={integrationHeroIcons}
        >
          <Badge
            variant="outline"
            className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm"
          >
            {m.integration_github()}
          </Badge>
          <Badge
            variant="outline"
            className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm"
          >
            {m.integration_slack()}
          </Badge>
          <Badge
            variant="outline"
            className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm"
          >
            {m.integration_linear()}
          </Badge>
          <Badge
            variant="outline"
            className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm"
          >
            {m.integration_sentry()}
          </Badge>
        </FloatingIconsHero>
      </main>
      <Footer />
    </div>
  );
}

function HomePage() {
  return (
    <I18nProvider>
      <HomePageInner />
    </I18nProvider>
  );
}

function HowItWorksSteps() {
  const { locale } = useLocale();
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      step: 1,
      icon: CircleDot,
      title: m.step_1_title(),
      description:
        locale === "zh-CN"
          ? "先定义明确目标、约束与验收标准，把工作拆成可执行结果。"
          : locale === "zh-TW"
            ? "先定義明確目標、約束與驗收標準，將工作拆成可執行結果。"
            : "Start with a clear goal, constraints, and success criteria so work stays grounded in outcomes.",
    },
    {
      step: 2,
      icon: Bot,
      title: m.step_2_title(),
      description:
        locale === "zh-CN"
          ? "按能力分配代理，让不同角色并行协作，而不是把所有任务塞给一个助手。"
          : locale === "zh-TW"
            ? "按能力分配代理，讓不同角色並行協作，而不是把所有任務塞給一個助手。"
            : "Assign the right agents for the job so specialized roles can work in parallel with clear responsibility.",
    },
    {
      step: 3,
      icon: Workflow,
      title: m.step_3_title(),
      description:
        locale === "zh-CN"
          ? "执行过程中持续接收反馈、处理异常并迭代，自动化流程不会脱离你的控制。"
          : locale === "zh-TW"
            ? "執行過程中持續接收回饋、處理異常並迭代，自動化流程不會脫離你的控制。"
            : "Keep the loop running with feedback, approvals, and iteration so automation stays visible and controllable.",
    },
  ];

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = activeStep === step.step;
        return (
          <button
            key={step.step}
            type="button"
            onClick={() => setActiveStep(step.step)}
            className={cn(
              "group flex w-full items-start gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200",
              isActive
                ? "bg-primary/5 ring-1 ring-primary/15 shadow-sm"
                : "hover:bg-muted/60",
            )}
          >
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground group-hover:bg-muted/80",
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-bold tabular-nums transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {String(step.step).padStart(2, "0")}
                </span>
                <h3
                  className={cn(
                    "text-base font-semibold transition-colors sm:text-lg",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </h3>
              </div>
              <p
                className={cn(
                  "mt-1 text-sm leading-6 transition-colors",
                  isActive ? "text-foreground/70" : "text-muted-foreground/60",
                )}
              >
                {step.description}
              </p>
            </div>
            {idx < steps.length - 1 && (
              <div className="absolute left-[3.1rem] mt-11 hidden h-4 w-px bg-border" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DashboardMockWindow() {
  const treeData = [
    {
      label: "OrchOS Project",
      open: true,
      children: [
        {
          label: "Goals",
          open: true,
          children: [
            { label: "Auth System", status: "active" as const },
            { label: "Collaboration", status: "active" as const },
            { label: "Bun Migration", status: "completed" as const },
          ],
        },
        {
          label: "Agents",
          open: true,
          children: [
            { label: "CodeAgent", status: "active" as const },
            { label: "ReviewAgent", status: "idle" as const },
            { label: "TestAgent", status: "active" as const },
          ],
        },
        {
          label: "Workflows",
          open: false,
          children: [
            { label: "Deploy Pipeline", status: "idle" as const },
            { label: "Review Flow", status: "active" as const },
          ],
        },
      ],
    },
  ];

  const statusDot: Record<string, string> = {
    active: "bg-emerald-400",
    idle: "bg-gray-400",
    completed: "bg-blue-400",
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="size-3 rounded-full bg-[#ff5f57]" />
          <div className="size-3 rounded-full bg-[#febc2e]" />
          <div className="size-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[11px] font-medium text-gray-400">OrchOS Dashboard</span>
        </div>
        <div className="w-[52px]" />
      </div>

      <div className="flex h-[420px]">
        <div className="w-52 shrink-0 border-r border-gray-200 bg-gray-50/80">
          <div className="border-b border-gray-200 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Monitor className="size-3 text-gray-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Layers</span>
            </div>
          </div>
          <div className="px-1.5 py-1.5">
            {treeData.map((root) => (
              <TreeItem key={root.label} item={root} depth={0} statusDot={statusDot} />
            ))}
          </div>
        </div>

        <div className="flex-1 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-indigo-50 flex items-center justify-center">
                <CircleDot className="size-3 text-indigo-500" />
              </div>
              <span className="text-xs font-semibold text-gray-800">Auth System</span>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">
              Active
            </span>
          </div>

          <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100">
            <div className="h-1.5 w-[65%] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
          </div>

          <div className="mb-4 space-y-2">
            {["JWT refresh token rotation", "Session persistence", "OAuth2 login flow"].map(
              (item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5"
                >
                  <div
                    className={cn(
                      "flex size-4 items-center justify-center rounded",
                      i < 2 ? "bg-emerald-50 text-emerald-500" : "bg-gray-100 text-gray-300",
                    )}
                  >
                    <span className="text-[8px]">{i < 2 ? "✓" : "○"}</span>
                  </div>
                  <span className={cn("text-[10px]", i < 2 ? "text-gray-600" : "text-gray-400")}>
                    {item}
                  </span>
                </div>
              ),
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Assigned Agents</p>
            <div className="flex gap-2">
              {[
                { name: "CodeAgent", status: "active" },
                { name: "TestAgent", status: "active" },
              ].map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5"
                >
                  <div className={cn("size-1.5 rounded-full", statusDot[agent.status])} />
                  <span className="text-[10px] text-gray-500">{agent.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Activity</p>
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="flex items-start gap-2">
                <Bot className="mt-0.5 size-3 text-indigo-500" />
                <div>
                  <p className="text-[10px] text-gray-500">CodeAgent implementing auth module</p>
                  <p className="text-[8px] text-gray-400">2 min ago</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="flex items-start gap-2">
                <Workflow className="mt-0.5 size-3 text-purple-500" />
                <div>
                  <p className="text-[10px] text-gray-500">Tests running for session persistence</p>
                  <p className="text-[8px] text-gray-400">5 min ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeItem({
  item,
  depth,
  statusDot,
}: {
  item: {
    label: string;
    open?: boolean;
    children?: Array<{
      label: string;
      open?: boolean;
      status?: string;
      children?: Array<{ label: string; status?: string }>;
    }>;
    status?: string;
  };
  depth: number;
  statusDot: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(item.open ?? false);
  const hasChildren = item.children && item.children.length > 0;
  const isRoot = depth === 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        className="flex w-full items-center gap-1 rounded px-1 py-[3px] text-left hover:bg-gray-100 transition-colors"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "size-3 shrink-0 text-gray-400 transition-transform duration-150",
              isOpen && "rotate-90",
            )}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {hasChildren ? (
          <FolderOpen className="size-3 shrink-0 text-gray-400" />
        ) : (
          <span className="flex size-3 shrink-0 items-center justify-center">
            <div className={cn("size-1.5 rounded-full", item.status ? statusDot[item.status] : "bg-gray-300")} />
          </span>
        )}
        <span
          className={cn(
            "truncate text-[10px]",
            isRoot ? "font-semibold text-gray-700" : "text-gray-500",
          )}
        >
          {item.label}
        </span>
      </button>
      {isOpen && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <TreeItem key={child.label} item={child} depth={depth + 1} statusDot={statusDot} />
          ))}
        </div>
      )}
    </div>
  );
}

