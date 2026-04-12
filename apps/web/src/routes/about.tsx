import { createFileRoute } from '@tanstack/react-router'
import Header from '#/components/layout/Header'
import Footer from '#/components/layout/Footer'
import { m } from '#/paraglide/messages'
import { I18nProvider } from '#/lib/useI18n'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <I18nProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <section className="mx-auto max-w-5xl px-4 py-12">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">About</p>
              <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
                OrchOS - {m.landing_subtitle()}
              </h1>
              <p className="m-0 max-w-3xl text-base leading-8 text-muted-foreground">
                {m.landing_description()}
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </I18nProvider>
  )
}
