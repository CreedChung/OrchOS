import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">About</p>
        <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
          OrchOS - AI Agent Orchestration System
        </h1>
        <p className="m-0 max-w-3xl text-base leading-8 text-muted-foreground">
          OrchOS is an intelligent agent orchestration system that coordinates
          multiple AI agents to accomplish complex goals. Built with Bun, Elysia, and React.
        </p>
      </section>
    </main>
  )
}
