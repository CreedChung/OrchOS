import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../db/schema";
import type { AppDb } from "../db/types";

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

function runLightweightMigrations(db: AppDb) {
  const sqlite = (db as any).$client;
  function hasColumn(table: string, column: string): boolean {
    const rows = sqlite.query(`PRAGMA table_info("${table}")`).all() as {
      name: string;
    }[];
    return rows.some((r) => r.name === column);
  }

  function hasTable(table: string): boolean {
    const rows = sqlite
      .query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`)
      .all();
    return rows.length > 0;
  }

  if (hasTable("conversations") && !hasColumn("conversations", "archived")) {
    sqlite.run("ALTER TABLE conversations ADD COLUMN archived TEXT NOT NULL DEFAULT 'false'");
  }
}
