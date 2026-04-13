import { createFileRoute } from '@tanstack/react-router'
import { EnvironmentsView } from '#/components/panels/EnvironmentsView'
import { useDashboard } from '#/lib/dashboard-context'

export const Route = createFileRoute('/dashboard/environments')({ component: EnvironmentsPage })

function EnvironmentsPage() {
  const { runtimes, projects, refreshAll } = useDashboard()

  return <EnvironmentsView runtimes={runtimes} projects={projects} onRefresh={refreshAll} />
}
