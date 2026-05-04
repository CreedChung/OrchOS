import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import { createDbPlugin } from "./plugins/db";
import { createAuthPlugin } from "./modules/auth";
import { createOrganizationController } from "./modules/organization";
import type { AppDb } from "./db/types";

import { createRuntimeController } from "./modules/runtime";
import { createProblemController } from "./modules/problem";
import { filesystemController } from "./modules/filesystem";
import { createConversationController } from "./modules/conversation";
import { createLocalHostController } from "./modules/local-hosts";

export interface AppOptions {
  db: AppDb;
  jwtKey?: string;
}

export function createApp(options: AppOptions) {
  const { db, jwtKey = "" } = options;
  const dbPlugin = createDbPlugin(db);
  const authPlugin = createAuthPlugin(jwtKey);
  const organizationController = createOrganizationController(db);
  const runtimeController = createRuntimeController(db);
  const problemController = createProblemController(db);
  const conversationController = createConversationController(db);
  const localHostController = createLocalHostController(db);

  return new Elysia()
    .use(cors())
    .use(dbPlugin)
    .use(authPlugin)
    .use(runtimeController)
    .use(organizationController)
    .use(problemController)
    .use(filesystemController)
    .use(conversationController)
    .use(localHostController);
}
