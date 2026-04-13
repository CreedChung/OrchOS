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
          <section className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="mb-2 text-4xl font-bold text-foreground">
              OrchOS
            </h1>
            <p className="mb-12 text-lg text-muted-foreground">
              {m.landing_subtitle()}
            </p>

            <div className="space-y-12 text-foreground">
              <div>
                <h2 className="mb-4 text-xl font-semibold">Why OrchOS?</h2>
                <div className="space-y-4 text-muted-foreground leading-7">
                  <p>
                    In today's rapidly evolving AI landscape, individual AI models are impressive — but the real
                    potential lies in coordinating multiple AI agents toward complex goals.
                  </p>
                  <p>
                    Each model has unique strengths: code generation, logical reasoning, creative writing. The
                    question is: how do you make them work together? How do you decompose a complex task, assign
                    it to the right agent, and integrate the results?
                  </p>
                  <p>
                    Traditional manual orchestration is tedious and error-prone. OrchOS provides an
                    OS-level solution that intelligently manages, schedules, and coordinates multiple AI agents
                    — just as an operating system manages processes.
                  </p>
                  <p>
                    OrchOS is infrastructure — let you focus on <strong className="text-foreground">what</strong> to
                    do, not <strong className="text-foreground">how</strong> to do it.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold">Core Ideas</h2>
                <div className="space-y-4 text-muted-foreground leading-7">
                  <p>
                    <strong className="text-foreground">Orchestration over Execution</strong> — The orchestration
                    layer defines the system's ceiling. It's not about making one AI better, but making
                    multiple AIs collaborate better.
                  </p>
                  <p>
                    <strong className="text-foreground">Modular Thinking</strong> — Every agent is an independent,
                    replaceable module. Standardized interfaces let you upgrade, swap, or add agents
                    without affecting the system.
                  </p>
                  <p>
                    <strong className="text-foreground">Adaptive Scheduling</strong> — The system dynamically
                    adjusts scheduling based on task characteristics and agent performance. Decisions
                    become more precise with more usage.
                  </p>
                  <p>
                    <strong className="text-foreground">Developer First</strong> — Clean, intuitive APIs and
                    tooling from the developer's perspective. Integration should feel natural, not like
                    a burden.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold">Problems Solved</h2>
                <div className="space-y-4 text-muted-foreground leading-7">
                  <p>
                    <strong className="text-foreground">1. Task Decomposition & Assignment</strong> — How to identify
                    sub-tasks in a complex goal? How to match the best agent to each? OrchOS provides
                    intelligent task decomposition and matching.
                  </p>
                  <p>
                    <strong className="text-foreground">2. Inter-Agent Communication</strong> — How do agents pass
                    information? Handle dependencies and concurrency? Built-in messaging and state sync
                    ensure smooth collaboration.
                  </p>
                  <p>
                    <strong className="text-foreground">3. Result Integration & Quality</strong> — How to merge outputs
                    from multiple agents? Resolve conflicts? OrchOS provides validation, conflict resolution,
                    and quality assessment.
                  </p>
                  <p>
                    <strong className="text-foreground">4. Performance & Cost Control</strong> — How to balance quality
                    with API costs? Speed with resource consumption? OrchOS intelligently optimizes execution
                    paths to reduce costs.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold">Who Uses OrchOS?</h2>
                <div className="space-y-4 text-muted-foreground leading-7">
                  <p>
                    <strong className="text-foreground">Solo Developers</strong> — One person, one team. Leverage
                    multiple AI agents simultaneously to dramatically boost dev speed and code quality.
                  </p>
                  <p>
                    <strong className="text-foreground">Tech Teams</strong> — Automate code reviews, task
                    assignment, and documentation. Let the team focus on creative work.
                  </p>
                  <p>
                    <strong className="text-foreground">AI Researchers</strong> — Explore multi-agent collaboration
                    paradigms. A flexible platform for rapidly testing orchestration strategies.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-xl font-semibold">Future Vision</h2>
                <div className="space-y-4 text-muted-foreground leading-7">
                  <p>
                    The future of software development is not humans coding alone — it's humans and AI agent
                    teams collaborating. OrchOS aims to be the infrastructure for this collaboration model:
                    an operating system where AI agents work together efficiently.
                  </p>
                  <p>
                    We are at the beginning of this transformation. OrchOS is not just a project — it's an
                    exploration: exploring the boundaries of human-AI collaboration, the potential of
                    multi-agent systems, and the possibilities of future work.
                  </p>
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
