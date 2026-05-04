import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../db/schema";
import type { AppDb } from "../db/types";
import { runLightweightMigrations } from "../db/lightweight-migrations";

export function createNodeDb(): AppDb {
  const DB_PATH = process.env.CORTEX_DB_PATH || "cortex.db";
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema }) as unknown as AppDb;
}

export function syncSchema(db: AppDb) {
  try {
    migrate(db as any, {
      migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname,
    });
  } catch (err: any) {
    console.warn("drizzle migrate failed — running lightweight fallback:", err.message);
  }

  runLightweightMigrations(db);
}
