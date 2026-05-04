import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../db/schema";
import type { AppDb } from "../db/types";
import { runLightweightMigrations } from "../db/lightweight-migrations";

export function createBunDb(): AppDb {
  const DB_PATH = process.env.CORTEX_DB_PATH || "cortex.db";
  const sqlite = new Database(DB_PATH, { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  return drizzle(sqlite, { schema }) as unknown as AppDb;
}

export function syncSchema(db: AppDb) {
  try {
    migrate(db as any, {
      migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname,
    });
  } catch (err: any) {
    console.warn("drizzle migrate failed — running lightweight fallback:", err.message);
    runLightweightMigrations(db);
  }
}
