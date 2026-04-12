import { createFileRoute } from '@tanstack/react-router'
import Header from '#/components/layout/Header'
import Footer from '#/components/layout/Footer'
import TimeLine_01 from '#/components/ui/release-time-line'
import { I18nProvider } from '#/lib/useI18n'

export const Route = createFileRoute('/changelog')({
  component: Changelog,
})

function Changelog() {
  return (
    <I18nProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <TimeLine_01 />
        </main>
        <Footer />
      </div>
    </I18nProvider>
  )
}
