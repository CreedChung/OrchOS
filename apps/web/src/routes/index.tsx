import { createFileRoute, Link } from '@tanstack/react-router'
import Header from '#/components/layout/Header'
import Footer from '#/components/layout/Footer'
import { m } from '#/paraglide/messages'
import { I18nProvider } from '#/lib/useI18n'
import { AppleHelloEffectEnglish } from '#/components/apple-hello-effect/apple-hello-effect-english'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <I18nProvider>
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
              <div className="mb-10 flex items-center justify-center text-primary">
                <AppleHelloEffectEnglish durationScale={0.8} />
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
          <section className="border-t border-border bg-card/50">
            <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
              <SectionLabel text={m.section_features()} />
              <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
                {m.features_heading()}
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <FeatureCard
                  icon={<AgentsIcon />}
                  title={m.feature_agents_title()}
                  description={m.feature_agents_desc()}
                />
                <FeatureCard
                  icon={<GoalsIcon />}
                  title={m.feature_goals_title()}
                  description={m.feature_goals_desc()}
                />
                <FeatureCard
                  icon={<AutomationIcon />}
                  title={m.feature_automation_title()}
                  description={m.feature_automation_desc()}
                />
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="border-t border-border">
            <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
              <SectionLabel text={m.section_how_it_works()} />
              <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
                {m.how_it_works_heading()}
              </h2>
              <div className="grid gap-8 sm:grid-cols-3">
                <StepCard step={1} title={m.step_1_title()} description={m.step_1_desc()} />
                <StepCard step={2} title={m.step_2_title()} description={m.step_2_desc()} />
                <StepCard step={3} title={m.step_3_title()} description={m.step_3_desc()} />
              </div>
            </div>
          </section>

          {/* Integrations */}
          <section className="border-t border-border bg-card/50">
            <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
              <SectionLabel text={m.section_integrations()} />
              <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:text-3xl">
                {m.integrations_heading()}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <IntegrationCard name={m.integration_github()} description={m.integration_github_desc()} />
                <IntegrationCard name={m.integration_slack()} description={m.integration_slack_desc()} />
                <IntegrationCard name={m.integration_linear()} description={m.integration_linear_desc()} />
                <IntegrationCard name={m.integration_sentry()} description={m.integration_sentry_desc()} />
              </div>
            </div>
          </section>

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
    </I18nProvider>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-primary">
      {text}
    </p>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {step}
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

function IntegrationCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold text-foreground">{name}</h3>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

function AgentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GoalsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function AutomationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" strokeLinecap="round" />
    </svg>
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
