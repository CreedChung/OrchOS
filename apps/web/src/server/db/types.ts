import * as schema from "./schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export type AppDb = DrizzleD1Database<typeof schema>;

export * from "./schema";
