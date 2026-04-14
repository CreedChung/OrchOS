import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"

import { goalController } from "./modules/goal"
import { projectController } from "./modules/project"
import { agentController } from "./modules/agent"
import { runtimeController } from "./modules/runtime"
import { stateController, stateItemController, artifactItemController } from "./modules/state"
import { activityController } from "./modules/activity"
import { eventController } from "./modules/event"
import { executionController, settingsController } from "./modules/execution"
import { wsController } from "./modules/ws"
import { organizationController } from "./modules/organization"
import { problemController } from "./modules/problem"
import { ruleController } from "./modules/rule"
import { commandController } from "./modules/command"
import { mcpController } from "./modules/mcp"
import { skillController } from "./modules/skill"
import { sandboxController } from "./modules/sandbox"
import { filesystemController } from "./modules/filesystem"
import { conversationController } from "./modules/conversation"
import { seedData } from "./db/seed"

import "./db"

seedData()

const app = new Elysia()
  .use(cors())
  .use(projectController)
  .use(goalController)
  .use(stateController)
  .use(stateItemController)
  .use(artifactItemController)
  .use(activityController)
  .use(agentController)
  .use(runtimeController)
  .use(eventController)
  .use(executionController)
  .use(settingsController)
  .use(wsController)
  .use(organizationController)
  .use(problemController)
  .use(ruleController)
  .use(commandController)
  .use(mcpController)
  .use(skillController)
  .use(sandboxController)
  .use(filesystemController)
  .use(conversationController)
  .listen(5173)

console.log(
  `🦊 Elysia server running at ${app.server?.hostname}:${app.server?.port}`
)
