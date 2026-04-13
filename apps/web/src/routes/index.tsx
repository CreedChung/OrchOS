import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import Header from '#/components/layout/Header'
import Footer from '#/components/layout/Footer'
import { m } from '#/paraglide/messages'
import { I18nProvider } from '#/lib/useI18n'
import { ShimmerText } from '#/components/ui/shimmer-text'
import { FeaturesBento } from '#/components/ui/features-bento'
import { GoalPreviewCard } from '#/components/ui/goal-preview-card'
import { AgentPreviewCard } from '#/components/ui/agent-preview-card'
import { InboxPreviewCard } from '#/components/ui/inbox-preview-card'
import { GooeyFilter } from '#/components/ui/gooey-filter'
import { FloatingIconsHero } from '#/components/ui/floating-icons-hero-section'
import { Badge } from '#/components/ui/badge'
import { useScreenSize } from '#/lib/use-screen-size'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '#/lib/utils'
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
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: HomePage })

const integrationHeroIcons = [
  { id: 1, icon: GitPullRequest, className: 'left-[8%] top-[12%]' },
  { id: 2, icon: MessageSquareMore, className: 'right-[10%] top-[18%]' },
  { id: 3, icon: KanbanSquare, className: 'bottom-[14%] left-[12%]' },
  { id: 4, icon: ShieldAlert, className: 'bottom-[10%] right-[12%]' },
  { id: 5, icon: GitBranch, className: 'left-[24%] top-[8%]' },
  { id: 6, icon: Workflow, className: 'right-[27%] top-[8%]' },
  { id: 7, icon: Bot, className: 'left-[20%] top-[58%]' },
  { id: 8, icon: DatabaseZap, className: 'left-[35%] top-[26%]' },
  { id: 9, icon: Cloud, className: 'right-[20%] top-[62%]' },
  { id: 10, icon: BellRing, className: 'left-[68%] bottom-[8%]' },
  { id: 11, icon: Command, className: 'right-[6%] top-[52%]' },
  { id: 12, icon: Cable, className: 'left-[6%] top-[68%]' },
  { id: 13, icon: Blocks, className: 'left-[52%] top-[10%]' },
  { id: 14, icon: AppWindow, className: 'right-[40%] bottom-[10%]' },
  { id: 15, icon: Sparkles, className: 'right-[32%] top-[32%]' },
]

function HomePageInner() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
        <main className="flex-1">

          {/* Hero */}
          <section className="relative flex h-screen -mt-14 items-center justify-center px-4 pt-14">
            <div className="absolute inset-0 z-0">
              <img
                src="/background.png"
                alt=""
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-background/40" />
            </div>
            <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
              <div className="mb-4">
                <OrchOSLogoIcon className="size-14 sm:size-16" />
              </div>
              <p className="mb-3 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                {m.hero_tagline()}
              </p>
              <div className="mb-10">
                <ShimmerText className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
                  OrchOS.
                </ShimmerText>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  {m.open_dashboard()}
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent"
                >
                  {m.learn_more()}
                </Link>
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
            <Badge variant="outline" className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm">
              {m.integration_github()}
            </Badge>
            <Badge variant="outline" className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm">
              {m.integration_slack()}
            </Badge>
            <Badge variant="outline" className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm">
              {m.integration_linear()}
            </Badge>
            <Badge variant="outline" className="h-8 rounded-full border-border/70 bg-background/75 px-3 text-sm backdrop-blur-sm">
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
                <p className="mb-8 max-w-lg text-sm text-muted-foreground">
                  {m.cta_desc()}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    {m.open_dashboard()}
                  </Link>
                  <a
                    href="https://github.com/orchos"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent"
                  >
                    {m.view_on_github()}
                  </a>
                </div>
              </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
  )
}

function HomePage() {
  return (
    <I18nProvider>
      <HomePageInner />
    </I18nProvider>
  )
}

function HowItWorksSteps() {
  const [activeStep, setActiveStep] = useState(1)
  const screenSize = useScreenSize()
  const gooeyStrength = screenSize.lessThan("md") ? 8 : 15

  const tabs = [
    { step: 1, label: m.step_1_title(), card: <GoalPreviewCard /> },
    { step: 2, label: m.step_2_title(), card: <AgentPreviewCard /> },
    { step: 3, label: m.step_3_title(), card: <InboxPreviewCard /> },
  ]

  return (
    <div className="mx-auto w-full max-w-[72rem]">
      <GooeyFilter id="gooey-tab-filter" strength={gooeyStrength} />

      <div className="relative">
        {/* Gooey layer: tab backgrounds + content panel, all sharing the goo filter */}
        <div style={{ filter: "url(#gooey-tab-filter)" }}>
          <div className="flex w-full">
            {tabs.map((tab) => (
              <div key={tab.step} className="relative flex-1 h-10 md:h-12">
                {activeStep === tab.step && (
                  <motion.div
                    layoutId="gooey-active-tab"
                    className="absolute inset-0 bg-accent rounded-t-lg"
                    transition={{
                      type: "spring",
                      bounce: 0.0,
                      duration: 0.4,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Content panel - connected to the active tab so gooey merges them */}
          <div className="h-[520px] w-full overflow-hidden rounded-b-lg bg-accent" />
        </div>

        {/* Interactive text overlay for tabs (no filter, stays sharp) */}
        <div className="absolute top-0 left-0 right-0 flex w-full">
          {tabs.map((tab) => (
            <button
              key={tab.step}
              onClick={() => setActiveStep(tab.step)}
              className={cn(
                "flex-1 h-10 md:h-12 flex items-center justify-center text-xs md:text-sm font-medium transition-colors z-10",
                activeStep === tab.step
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card content overlay (no filter, stays sharp) */}
        <div className="absolute inset-x-0 top-10 bottom-0 h-[520px] p-2 md:top-12 md:p-3">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full w-full"
            >
              {tabs.find((t) => t.step === activeStep)?.card}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-primary">
      {text}
    </p>
  )
}

function OrchOSLogoIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 185 185" fill="none" {...props}>
      <rect width="185" height="185" rx="38" fill="#0048EF" />
      <circle cx="77" cy="86" r="40" stroke="white" strokeWidth="16" />
      <circle cx="77" cy="86" r="17.5" stroke="white" strokeWidth="15" />
      <rect x="67" y="106" width="20" height="41" fill="white" />
      <rect x="117" y="86" width="20" height="41" fill="white" />
      <rect x="137" y="107" width="20" height="40" fill="white" />
      <rect x="67" y="147" width="20" height="50" transform="rotate(-90 67 147)" fill="white" />
      <rect x="117" y="127" width="20" height="35" transform="rotate(-90 117 127)" fill="white" />
    </svg>
  )
}
