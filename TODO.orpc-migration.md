# oRPC Migration Todo

目标：把 `apps/web/src/routes/api*.ts` 暴露的现有 API 全部迁移到 `oRPC`，并移除 `apps/web/src/lib/api.ts` 中对这些 REST 风格接口的直接 `fetch` 依赖。

## Migration Rules

- [ ] 所有业务 API 都要先定义 contract，再实现 server router，再切换 client 调用。
- [ ] 新增 contract 时，前端只能依赖 `contract` 或 `client`，不能直接 import 服务端 router 实现。
- [ ] 每个领域迁移后，都要把 `apps/web/src/lib/api.ts` 对应方法切到 `oRPC` client。
- [ ] 每个领域迁移后，都要检查对应 UI/调用方是否还残留 `fetch("/api/...`)`。
- [ ] 迁移完成后，删除已被替代的旧 `api.*` route 文件。
- [ ] 保留 `api.chat.ts` 是否继续存在，需要在 conversation/chat 迁移时统一决定。
- [ ] 保留 `api.$.ts` 代理是否继续存在，需要在全部 API 完成迁移后再决定。
- [ ] 每批迁移后至少运行 `bun run check-types` 和 `bun run lint:strict`。

## Foundation

- [x] 安装 `@orpc/client`、`@orpc/contract`、`@orpc/server`、`zod`
- [x] 建立 `oRPC` 统一入口路由 `apps/web/src/routes/api.rpc.$.ts`
- [x] 建立初始共享 contract 文件和 client 文件
- [x] 将单一 `project-contract.ts` 重构为按领域拆分的 contract 目录结构
- [x] 将单一 `server/orpc/router.ts` 重构为按领域组合的 router 结构
- [x] 为 `oRPC` client 增加统一错误处理策略
- [x] 为 `oRPC` client 增加鉴权 header / Clerk token 策略，覆盖当前 `withSessionAuthorization`
- [ ] 明确哪些 procedure 需要 cookie，哪些需要 bearer token，避免迁移后认证回归

## Projects

对应旧路由：
- `apps/web/src/routes/api.projects.ts`
- `apps/web/src/routes/api.projects.$id.ts`

对应 `api.ts` 方法：
- `listProjects`
- `getProject`
- `createProject`
- `updateProject`
- `deleteProject`

Todo：
- [x] 定义 `projects` contract
- [x] 实现 `projects` router
- [x] 将 `api.ts` 中 `projects` 方法切到 `oRPC`
- [x] 检查所有 project 相关调用点，确认无直接 `/api/projects` 残留
- [x] 删除旧 `api.projects.ts` 和 `api.projects.$id.ts`

## Runtimes

对应旧路由：
- `apps/web/src/routes/api.runtimes.ts`
- `apps/web/src/routes/api.runtimes.detect.ts`
- `apps/web/src/routes/api.runtimes.detect.register.ts`
- `apps/web/src/routes/api.runtimes.$id.ts`
- `apps/web/src/routes/api.runtimes.$runtimeId.health.ts`
- `apps/web/src/routes/api.runtimes.$runtimeId.model.ts`
- `apps/web/src/routes/api.runtimes.$runtimeId.chat.ts`

对应 `api.ts` 方法：
- `listRuntimes`
- `detectRuntimes`
- `registerDetectedRuntimes`
- `updateRuntime`
- `healthCheckRuntime`
- `listRuntimeModels`
- `chatWithRuntime`

Todo：
- [x] 定义 `runtimes` contract
- [x] 实现 `runtimes` router
- [x] 处理 query 参数形式的 health level / detect filters 输入建模
- [x] 处理 runtime chat 返回结构与错误结构建模
- [x] 将 `api.ts` 中 runtime 相关方法切到 `oRPC`
- [x] 检查 dashboard / agents / creation 等调用方是否有直接 `/api/runtimes` 残留
- [x] 删除对应旧 route 文件

## Local Agents

对应旧路由：
- `apps/web/src/routes/api.local-agents.ts`
- `apps/web/src/routes/api.local-agents.pairing-tokens.ts`
- `apps/web/src/routes/api.local-agents.pair.ts`
- `apps/web/src/routes/api.local-agents.heartbeat.ts`

对应 `api.ts` 方法：
- `listLocalAgents`
- `createLocalAgentPairingToken`

额外检查：
- 配对、心跳、设备注册调用方可能不都在 `api.ts`，需要搜索全仓库

Todo：
- [x] 定义 `localAgents` contract
- [x] 实现 `localAgents` router
- [x] 设计需要认证与匿名访问的边界
- [x] 处理 pairing token、pair、heartbeat 的输入输出 schema
- [x] 将 `api.ts` 中 local agent 方法切到 `oRPC`
- [x] 搜索并替换非 `api.ts` 的本地代理调用方
- [x] 删除对应旧 route 文件

## Integrations

对应旧路由：
- `apps/web/src/routes/api.integrations.ts`
- `apps/web/src/routes/api.integrations.$id.connect.ts`
- `apps/web/src/routes/api.integrations.$id.disconnect.ts`
- `apps/web/src/routes/api.integrations.google.$id.accounts.ts`
- `apps/web/src/routes/api.integrations.smtp-imap.accounts.ts`
- `apps/web/src/routes/api.integrations.$id.accounts.$accountId.ts`

对应 `api.ts` 方法：
- `listIntegrations`
- `connectIntegration`
- `connectGoogleIntegration`
- `createSmtpImapAccount`
- `updateIntegrationAccount`
- `deleteIntegrationAccount`
- `disconnectIntegration`

Todo：
- [x] 定义 `integrations` contract
- [x] 实现 `integrations` router
- [x] 拆清 GitHub/GitLab、Google、SMTP/IMAP 三类输入 schema
- [x] 处理 account 级别 patch/delete 的 path 参数建模
- [x] 将 `api.ts` 中 integration 相关方法切到 `oRPC`
- [x] 检查调用方是否还存在直接 `/api/integrations` 请求
- [x] 删除对应旧 route 文件

## Filesystem

对应旧路由：
- `apps/web/src/routes/api.filesystem.browse.ts`
- `apps/web/src/routes/api.filesystem.file.ts`

对应 `api.ts` 方法：
- `browseDirectory`
- `readWorkspaceFile`
- `writeWorkspaceFile`

Todo：
- [ ] 定义 `filesystem` contract
- [ ] 实现 `filesystem` router
- [ ] 建模 browse 的 query 输入与 file read/write 输入
- [ ] 明确文件内容返回 `string | null` 的约束
- [ ] 将 `api.ts` 中 filesystem 方法切到 `oRPC`
- [ ] 删除对应旧 route 文件

## Settings

对应旧路由：
- `apps/web/src/routes/api.settings.ts`

对应 `api.ts` 方法：
- `getSettings`
- `updateSettings`

Todo：
- [x] 定义 `settings` contract
- [x] 实现 `settings` router
- [x] 将 `api.ts` 中 settings 方法切到 `oRPC`
- [x] 删除旧 `api.settings.ts`

## Organizations

对应旧路由：
- `apps/web/src/routes/api.organizations.ts`
- `apps/web/src/routes/api.organizations.$id.ts`

对应 `api.ts` 方法：
- `listOrganizations`
- `createOrganization`
- `updateOrganization`
- `deleteOrganization`

Todo：
- [x] 定义 `organizations` contract
- [x] 实现 `organizations` router
- [x] 将 `api.ts` 中 organization 方法切到 `oRPC`
- [x] 检查 dashboard / settings 调用点残留
- [x] 删除对应旧 route 文件

## Problems

对应旧路由：
- `apps/web/src/routes/api.problems.ts`
- `apps/web/src/routes/api.problems.$id.ts`
- `apps/web/src/routes/api.problems.counts.ts`
- `apps/web/src/routes/api.problems.summary.ts`
- `apps/web/src/routes/api.problems.bulk.ts`

对应 `api.ts` 方法：
- `listProblems`
- `getProblemCounts`
- `getProblemSummary`
- `createProblem`
- `updateProblem`
- `deleteProblem`
- `bulkUpdateProblems`

Todo：
- [x] 定义 `problems` contract
- [x] 实现 `problems` router
- [x] 处理 list filters、bulk status update 的输入 schema
- [x] 将 `api.ts` 中 problem 方法切到 `oRPC`
- [x] 删除对应旧 route 文件

## Inbox

对应旧路由：
- `apps/web/src/routes/api.inbox.threads.ts`
- `apps/web/src/routes/api.inbox.threads.$id.ts`
- `apps/web/src/routes/api.inbox.threads.$id.messages.ts`

对应 `api.ts` 方法：
- `listInboxThreads`
- `getInboxThread`
- `updateInboxThread`
- `listInboxMessages`
- `addInboxMessage`

Todo：
- [x] 定义 `inbox` contract
- [x] 实现 `inbox` router
- [x] 处理 thread list filters、message create payload 的 schema
- [x] 统一 thread/message 的 normalize 策略，尽量减少 client 端二次修正
- [x] 将 `api.ts` 中 inbox 方法切到 `oRPC`
- [x] 删除对应旧 route 文件

## Bookmarks

对应旧路由：
- `apps/web/src/routes/api.bookmarks.ts`
- `apps/web/src/routes/api.bookmarks.move.ts`
- `apps/web/src/routes/api.bookmarks.categories.$id.ts`
- `apps/web/src/routes/api.bookmarks.categories.$categoryId.items.$itemId.ts`

对应 `api.ts` 方法：
- `listBookmarks`
- `replaceBookmarks`
- `createBookmarkCategory`
- `createBookmarkItem`
- `updateBookmarkCategory`
- `deleteBookmarkCategory`
- `updateBookmarkItem`
- `deleteBookmarkItem`
- `moveBookmarkItem`

Todo：
- [x] 定义 `bookmarks` contract
- [x] 实现 `bookmarks` router
- [x] 建模 category/item/move 三类输入
- [x] 将 `api.ts` 中 bookmark 方法切到 `oRPC`
- [x] 删除对应旧 route 文件


## Custom Agents

对应旧路由：
- `apps/web/src/routes/api.custom-agents.ts`
- `apps/web/src/routes/api.custom-agents.$id.ts`

对应 `api.ts` 方法：
- `listCustomAgents`
- `createCustomAgent`
- `updateCustomAgent`
- `deleteCustomAgent`

Todo：
- [x] 定义 `customAgents` contract
- [x] 实现 `customAgents` router
- [x] 将 `api.ts` 中 custom agent 方法切到 `oRPC`
- [x] 删除对应旧 route 文件

## Filesystem

对应旧路由：
- `apps/web/src/routes/api.filesystem.browse.ts`
- `apps/web/src/routes/api.filesystem.file.ts`

对应 `api.ts` 方法：
- `browseDirectory`
- `readWorkspaceFile`
- `writeWorkspaceFile`

Todo：
- [x] 定义 `filesystem` contract
- [x] 实现 `filesystem` router
- [x] 建模 browse 的 query 输入与 file read/write 输入
- [x] 明确文件内容返回 `string | null` 的约束
- [x] 将 `api.ts` 中 filesystem 方法切到 `oRPC`
- [x] 删除对应旧 route 文件

## Conversations

对应旧路由：
- `apps/web/src/routes/api.conversations.ts`
- `apps/web/src/routes/api.conversations.$id.ts`
- `apps/web/src/routes/api.conversations.deleted.ts`
- `apps/web/src/routes/api.conversations.$id.messages.ts`

对应 `api.ts` 方法：
- `listConversations`
- `getConversation`
- `createConversation`
- `updateConversation`
- `deleteConversation`
- `clearDeletedConversations`
- `getConversationMessages`
- `sendConversationMessage`

Todo：
- [x] 定义 `conversations` contract
- [x] 实现 `conversations` router
- [x] 处理 soft delete / permanent delete / clear deleted 的输入建模
- [x] 处理 message trace、error、execution metadata 的输出 schema
- [x] 将 `api.ts` 中 conversation 方法切到 `oRPC`
- [x] 删除对应旧 route 文件

## Chat

对应旧路由：
- `apps/web/src/routes/api.chat.ts`

说明：
- 该路由当前负责 AI SDK `createUIMessageStreamResponse` 流式桥接，不是普通 JSON CRUD 接口。
- 它此前会调用 `/api/conversations/$id/messages`。

Todo：
- [ ] 决定 `api.chat.ts` 是否继续作为 AI SDK 兼容层保留
- [ ] 如果迁移到 `oRPC`，设计 streaming procedure 与 AI SDK 对接方式
- [x] 如果保留桥接层，改为内部调用 `oRPC` server-side client，而不是再请求旧 REST route
- [ ] 完成后删除或瘦身旧 `api.chat.ts`

## Observability

对应旧路由：
- `apps/web/src/routes/api.observability.throughput.ts`
- `apps/web/src/routes/api.observability.metrics.ts`

对应 `api.ts` 方法：
- `getObservabilityThroughput`
- `getObservabilityMetrics`

Todo：
- [x] 定义 `observability` contract
- [x] 实现 `observability` router
- [x] 处理 `range` query 的输入 schema
- [x] 将 `api.ts` 中 observability 方法切到 `oRPC`
- [x] 删除对应旧 route 文件

## Fallback / Proxy Cleanup

对应旧路由：
- `apps/web/src/routes/api.$.ts`

当前现状：
- 内部业务 API 已全部迁移出 `api.$.ts`。
- `/api/github-stars` 已拆为显式独立 route：`apps/web/src/routes/api.github-stars.ts`。
- 通配代理 `api.$.ts` 已删除，不再保留基于环境变量的全路径转发能力。

Todo：
- [x] 盘点当前还有哪些请求经过 `api.$.ts` 代理
- [x] 决定 `/api/github-stars` 是继续保留在 `api.$.ts`，还是拆成显式独立 route（倾向拆独立 route，避免继续依赖通配入口）
- [x] 确认是否还需要面向外部后端的通配代理；如果没有明确调用方，删除 `api.$.ts` 的通配转发逻辑
- [x] 如果仍需保留外部代理，收窄为明确 allowlist/显式 route，避免继续保留全路径通配能力

## Cross-Cutting Cleanup

- [x] 搜索全仓库 `resolveApiUrl("/api/` 并逐项替换为 `oRPC` client
- [x] 搜索全仓库 ``fetch(resolveApiUrl(`/api/`` 并逐项替换为 `oRPC` client
- [x] 搜索全仓库原始字符串 `"/api/`，确认没有遗漏的直接请求
- [x] 将 `apps/web/src/lib/api.ts` 拆分为按领域的 client facade，避免单文件继续膨胀
- [x] 为每个领域补充最少的类型/行为验证
- [x] 最终删除所有已废弃的 `apps/web/src/routes/api*.ts` 旧 REST 文件，只保留 `api.rpc.$.ts` 与必要的非 RPC 特例

## Suggested Order

- [x] Batch 1: `settings`, `organizations`, `problems`
- [x] Batch 2: `bookmarks`, `customAgents`, `filesystem`
- [x] Batch 3: `runtimes`, `localAgents`, `integrations`
- [x] Batch 4: `inbox`, `conversations`, `chat`
- [x] Batch 5: `observability`, `api.$.ts` cleanup, final route deletion

## Verification Gate Per Batch

- [x] `bun run check-types`
- [x] `bun run lint:strict`
- [ ] `bun run test` if the app test environment is healthy
  当前 `apps/web` 的 Vitest 在启动阶段报错：`TypeError: require_react_dom is not a function`
- [ ] 手动检查对应页面/交互是否仍然工作
