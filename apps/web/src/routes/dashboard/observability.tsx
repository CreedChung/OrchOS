import { createFileRoute } from '@tanstack/react-router'
import { ObservabilityView } from '#/components/panels/ObservabilityView'
import { useDashboard } from '#/lib/dashboard-context'

export const Route = createFileRoute('/dashboard/observability')({ component: ObservabilityPage })

function ObservabilityPage() {
  const { agents, goals, problems } = useDashboard()

  return <ObservabilityView agents={agents} goals={goals} problems={problems} />
}
