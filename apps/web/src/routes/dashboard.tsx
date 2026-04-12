import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '#/components/layout/Dashboard'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

function DashboardPage() {
  return <Dashboard />
}
