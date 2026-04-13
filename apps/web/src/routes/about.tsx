import { createFileRoute } from '@tanstack/react-router'
import Header from '#/components/layout/Header'
import Footer from '#/components/layout/Footer'
import { m } from '#/paraglide/messages'
import { I18nProvider } from '#/lib/useI18n'
import { ProgressiveBlur } from '#/components/ui/progressive-blur'

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
            {/* 顶部介绍卡片 */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">About</p>
              <h1 className="mb-3 text-4xl font-bold text-foreground sm:text-5xl">
                OrchOS - {m.landing_subtitle()}
              </h1>
              <p className="m-0 max-w-3xl text-base leading-8 text-muted-foreground">
                {m.landing_description()}
              </p>
            </div>

            {/* 渐进式模糊内容区域 */}
            <div className="mt-8">
              <ProgressiveBlur>
                <div className="space-y-8">
                  {/* 为什么建造 OrchOS */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-foreground">为什么建造 OrchOS？</h2>
                    <div className="space-y-6 text-muted-foreground">
                      <p className="leading-7">
                        在当今快速发展的 AI 时代，单个 AI 模型的能力已经令人惊叹，但真正的潜力在于如何将多个 AI
                        代理协调起来，共同完成复杂的目标。这就是 OrchOS 诞生的原因。
                      </p>
                      <p className="leading-7">
                        我发现自己每天都在与各种 AI 工具打交道，每个模型都有其独特的优势：有些擅长代码生成，有些精于逻辑推理，有些在创意写作方面表现突出。但问题是，如何让它们协同工作？如何把一个复杂任务拆解，分配给最合适的代理，然后整合结果？
                      </p>
                      <p className="leading-7">
                        传统的做法是手动编排每个步骤，这不仅繁琐而且容易出错。我相信应该有更好的方式——一个操作系统级别的解决方案，能够智能地管理、调度和协调多个 AI 代理，就像操作系统管理多个进程一样。
                      </p>
                      <p className="leading-7">
                        于是，OrchOS 应运而生。它不只是一个工具，更是一个基础设施——让你能够专注于<strong className="text-foreground">做什么</strong>，而不是<strong className="text-foreground">怎么做</strong>。
                      </p>
                    </div>
                  </div>

                  {/* 核心理念 */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-foreground">核心理念</h2>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-background/50 p-5">
                        <h3 className="mb-2 text-lg font-semibold text-foreground">🎯 编排胜于执行</h3>
                        <p className="text-sm text-muted-foreground">
                          真正的问题不是如何让一个 AI 做得更好，而是如何让多个 AI 协作得更好。编排层的设计决定了整个系统的上限。
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-5">
                        <h3 className="mb-2 text-lg font-semibold text-foreground">🧩 模块化思维</h3>
                        <p className="text-sm text-muted-foreground">
                          每个代理都是一个独立的、可替换的模块。通过标准化的接口，你可以随时升级、替换或添加新的代理，而不影响整个系统。
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-5">
                        <h3 className="mb-2 text-lg font-semibold text-foreground">🔄 自适应调度</h3>
                        <p className="text-sm text-muted-foreground">
                          系统会根据任务特性和代理表现，动态调整调度策略。随着使用量的增加，决策会越来越精准。
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background/50 p-5">
                        <h3 className="mb-2 text-lg font-semibold text-foreground">🚀 开发者优先</h3>
                        <p className="text-sm text-muted-foreground">
                          从开发者的角度出发，提供简洁直观的 API 和工具链。让集成 OrchOS 成为一件自然而然的事情，而不是负担。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 解决的实际问题 */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-foreground">解决的实际问题</h2>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          1
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold text-foreground">复杂任务的拆解与分配</h3>
                          <p className="text-sm text-muted-foreground">
                            面对一个复杂目标，如何识别其中的子任务？如何判断哪个代理最适合执行哪个子任务？OrchOS
                            提供智能化的任务分解和匹配能力。
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          2
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold text-foreground">多代理之间的通信与协调</h3>
                          <p className="text-sm text-muted-foreground">
                            代理之间如何传递信息？如何处理依赖关系和并发执行？OrchOS 内置消息传递和状态同步机制，确保协作顺畅。
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          3
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold text-foreground">结果的整合与质量保障</h3>
                          <p className="text-sm text-muted-foreground">
                            多个代理的输出如何整合？如何处理冲突和不一致？OrchOS 提供结果验证、冲突解决和质量评估机制。
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          4
                        </div>
                        <div>
                          <h3 className="mb-1 font-semibold text-foreground">性能优化与成本控制</h3>
                          <p className="text-sm text-muted-foreground">
                            如何在保证质量的同时控制 API 调用成本？如何平衡响应速度和资源消耗？OrchOS
                            智能优化执行路径，降低成本。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 目标用户 */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="mb-6 text-2xl font-bold text-foreground">谁在使用 OrchOS？</h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                        <h3 className="mb-2 font-semibold text-foreground">👨‍💻 独立开发者</h3>
                        <p className="text-sm text-muted-foreground">
                          一个人就是一个团队。通过 OrchOS，你可以同时利用多个 AI 代理的力量，大幅提升开发效率和代码质量。
                        </p>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                        <h3 className="mb-2 font-semibold text-foreground">🏢 技术团队</h3>
                        <p className="text-sm text-muted-foreground">
                          将 OrchOS 集成到工作流中，实现自动化代码审查、任务分配、文档生成等重复性工作，让团队专注于创造性工作。
                        </p>
                      </div>
                      <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                        <h3 className="mb-2 font-semibold text-foreground">🤖 AI 研究者</h3>
                        <p className="text-sm text-muted-foreground">
                          探索和实验多代理协作的新范式。OrchOS 提供了一个灵活的平台，让你能够快速测试不同的编排策略。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 未来愿景 */}
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h2 className="mb-4 text-2xl font-bold text-foreground">未来愿景</h2>
                    <p className="mb-4 leading-7 text-muted-foreground">
                      我相信，未来的软件开发将不再是人类独自编码，而是人类与 AI 代理团队协作。OrchOS
                      的目标是成为这个协作模式的基础设施——一个让 AI
                      代理能够高效协作的操作系统。
                    </p>
                    <p className="mb-0 leading-7 text-muted-foreground">
                      我们正处于这个变革的起点。OrchOS 不仅是一个项目，更是一个探索——探索人机协作的边界，探索多智能体系统的潜力，探索未来工作的可能性。
                    </p>
                  </div>
                </div>
              </ProgressiveBlur>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </I18nProvider>
  )
}
