import { createFileRoute, Link } from '@tanstack/react-router'
import Header from '#/components/layout/Header'
import Footer from '#/components/layout/Footer'
import { m } from '#/paraglide/messages'
import { I18nProvider } from '#/lib/useI18n'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <I18nProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <section className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <span className="h-4 w-4 rounded-full bg-primary" />
              </div>
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                OrchOS
              </h1>
              <p className="mb-3 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                {m.landing_subtitle()}
              </p>
              <p className="mb-10 max-w-xl text-sm text-muted-foreground/70">
                {m.landing_description()}
              </p>
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

          <section className="border-t border-border bg-card/50">
            <div className="mx-auto grid max-w-5xl gap-6 px-4 py-16 sm:grid-cols-3 sm:py-20">
              <FeatureCard
                title={m.feature_agents_title()}
                description={m.feature_agents_desc()}
              />
              <FeatureCard
                title={m.feature_goals_title()}
                description={m.feature_goals_desc()}
              />
              <FeatureCard
                title={m.feature_automation_title()}
                description={m.feature_automation_desc()}
              />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </I18nProvider>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <h3 className="mb-2 text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}
