import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '#/components/layout/Dashboard'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return <Dashboard />
}
