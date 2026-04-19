import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import { createDbPlugin } from "./plugins/db";
import { createAuthPlugin } from "./modules/auth";
import { createGoalController } from "./modules/goal";
import { createOrganizationController } from "./modules/organization";
import { createAgentController, type StorageAdapter } from "./modules/agent";
import { createExecutionController, createSettingsController } from "./modules/execution";
import type { AppDb } from "./db/types";
import type { ObjectStorageAdapter } from "./cloudflare/object-storage";

import { createProjectController } from "./modules/project";
import {
  createArtifactItemController,
  createStateController,
  createStateItemController,
} from "./modules/state";
import { createActivityController } from "./modules/activity";
import { createRuntimeController } from "./modules/runtime";
import { createEventController } from "./modules/event";
import { createProblemController } from "./modules/problem";
import { createRuleController } from "./modules/rule";
import { createCommandController } from "./modules/command";
import { createMcpController } from "./modules/mcp";
import { createSkillController } from "./modules/skill";
import { filesystemController } from "./modules/filesystem";
import { createConversationController } from "./modules/conversation";
import { createWsController, broadcastEvent } from "./modules/ws";
import { configureRealtimePublisher } from "./modules/event/event-bus";

export interface AppOptions {
  db: AppDb;
  jwtKey?: string;
  storage?: StorageAdapter;
  artifactStorage?: ObjectStorageAdapter;
}

export function createApp(options: AppOptions) {
  const { db, jwtKey = "", storage, artifactStorage } = options;
  const dbPlugin = createDbPlugin(db);
  const authPlugin = createAuthPlugin(jwtKey);
  const goalController = createGoalController(db);
  const organizationController = createOrganizationController(db);
  const agentController = createAgentController(db, storage);
  const executionController = createExecutionController(db, artifactStorage);
  const settingsController = createSettingsController(db);
  const projectController = createProjectController(db);
  const stateController = createStateController(db);
  const stateItemController = createStateItemController(db);
  const artifactItemController = createArtifactItemController(db);
  const activityController = createActivityController(db);
  const runtimeController = createRuntimeController(db);
  const eventController = createEventController(db);
  const problemController = createProblemController(db);
  const ruleController = createRuleController(db);
  const commandController = createCommandController(db);
  const mcpController = createMcpController(db);
  const skillController = createSkillController(db);
  const conversationController = createConversationController(db);

  configureRealtimePublisher(async (event) => {
    broadcastEvent(event);
  });

  return new Elysia()
    .use(cors())
    .use(dbPlugin)
    .use(authPlugin)
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
    .use(organizationController)
    .use(problemController)
    .use(ruleController)
    .use(commandController)
    .use(mcpController)
    .use(skillController)
    .use(filesystemController)
    .use(conversationController)
    .use(createWsController());
}
