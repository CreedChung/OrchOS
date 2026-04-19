import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { m } from "@/paraglide/messages";
import { I18nProvider, useLocale } from "@/lib/useI18n";
import { FeaturesBento } from "@/components/ui/features-bento";
import { GoalPreviewCard } from "@/components/ui/goal-preview-card";
import { AgentPreviewCard } from "@/components/ui/agent-preview-card";
import { InboxPreviewCard } from "@/components/ui/inbox-preview-card";
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
        <section className="border-t border-border min-h-screen flex flex-col justify-center">
          <div className="mx-auto w-full max-w-[80rem] px-6 py-16 sm:px-8 sm:py-20">
            <SectionLabel text={m.section_how_it_works()} />
            <h2 className="mb-12 text-center text-2xl font-bold text-foreground sm:text-3xl">
              {m.how_it_works_heading()}
            </h2>

            <HowItWorksSteps />
          </div>
        </section>

        {/* Integrations */}
        <FloatingIconsHero
          className="border-t border-border bg-card/40"
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

        {/* Architecture */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
              <div>
                <SectionLabel text={m.section_architecture()} />
                <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
                  {m.architecture_heading()}
                </h2>
                <p className="mb-6 text-sm leading-7 text-muted-foreground">
                  {m.architecture_desc()}
                </p>
                <ul className="space-y-3">
                  {[
                    m.arch_feat_bun(),
                    m.arch_feat_elysia(),
                    m.arch_feat_react(),
                    m.arch_feat_mcp(),
                    m.arch_feat_i18n(),
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-3 font-mono text-xs">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <span className="text-primary">orchos</span>
                    <span className="text-muted-foreground">@</span>
                    <span className="text-foreground">v0.1.0</span>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <span className="text-muted-foreground">agents:</span>
                    <span className="ml-2 text-foreground">3 {m.arch_status_agents()}</span>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <span className="text-muted-foreground">goals:</span>
                    <span className="ml-2 text-green-500">5 {m.arch_status_goals_completed()}</span>
                    <span className="ml-2 text-primary">2 {m.arch_status_goals_active()}</span>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <span className="text-muted-foreground">rules:</span>
                    <span className="ml-2 text-foreground">7 {m.arch_status_rules()}</span>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <span className="text-muted-foreground">mcp servers:</span>
                    <span className="ml-2 text-foreground">2 {m.arch_status_mcp()}</span>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3 text-primary">
                    ✓ {m.arch_status_healthy()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-gradient-to-b from-card/50 to-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
            <div className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-4xl">
                {m.cta_heading()}
              </h2>
              <p className="mb-8 max-w-lg text-sm text-muted-foreground">{m.cta_desc()}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="h-auto px-6 py-3 shadow-sm">
                  <Link to="/dashboard">{m.open_dashboard()}</Link>
                </Button>
                <Button asChild variant="outline" className="h-auto bg-card px-6 py-3 shadow-sm">
                  <a href="https://github.com/orchos" target="_blank" rel="noreferrer">
                    {m.view_on_github()}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
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
      label: m.step_1_title(),
      title: m.step_1_title(),
      description:
        locale === "zh-CN"
          ? "先定义明确目标、约束与验收标准，把工作拆成可执行结果。"
          : locale === "zh-TW"
            ? "先定義明確目標、約束與驗收標準，將工作拆成可執行結果。"
            : "Start with a clear goal, constraints, and success criteria so work stays grounded in outcomes.",
      card: <GoalPreviewCard />,
    },
    {
      step: 2,
      label: m.step_2_title(),
      title: m.step_2_title(),
      description:
        locale === "zh-CN"
          ? "按能力分配代理，让不同角色并行协作，而不是把所有任务塞给一个助手。"
          : locale === "zh-TW"
            ? "按能力分配代理，讓不同角色並行協作，而不是把所有任務塞給一個助手。"
            : "Assign the right agents for the job so specialized roles can work in parallel with clear responsibility.",
      card: <AgentPreviewCard />,
    },
    {
      step: 3,
      label: m.step_3_title(),
      title: m.step_3_title(),
      description:
        locale === "zh-CN"
          ? "执行过程中持续接收反馈、处理异常并迭代，自动化流程不会脱离你的控制。"
          : locale === "zh-TW"
            ? "執行過程中持續接收回饋、處理異常並迭代，自動化流程不會脫離你的控制。"
            : "Keep the loop running with feedback, approvals, and iteration so automation stays visible and controllable.",
      card: <InboxPreviewCard />,
    },
  ];
  const currentStep = steps[activeStep - 1] ?? steps[0];

  return (
    <div className="mx-auto w-full max-w-[76rem]">
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card/70 p-3 shadow-sm backdrop-blur-sm">
            <div className="space-y-2">
              {steps.map((step) => (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => setActiveStep(step.step)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors",
                    activeStep === step.step
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                  aria-current={activeStep === step.step ? "step" : undefined}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      activeStep === step.step
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {step.step}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-[2rem] border border-border bg-card/40 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="mb-5 flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
              {currentStep.step}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">{currentStep.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {currentStep.description}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-background/70 p-2 sm:p-3">
            <div className="h-[520px] w-full">{currentStep.card}</div>
          </div>

        </section>
      </div>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-primary">
      {text}
    </p>
  );
}
