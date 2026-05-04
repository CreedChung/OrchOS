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

  if (hasTable("conversations") && !hasColumn("conversations", "deleted")) {
    sqlite.run("ALTER TABLE conversations ADD COLUMN deleted TEXT NOT NULL DEFAULT 'false'");
  }

  if (!hasTable("local_hosts")) {
    sqlite.run(`
      CREATE TABLE "local_hosts" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "user_id" TEXT NOT NULL,
        "organization_id" TEXT,
        "device_id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "host_token" TEXT NOT NULL,
        "platform" TEXT,
        "app_version" TEXT,
        "status" TEXT NOT NULL DEFAULT 'online',
        "runtimes" TEXT NOT NULL DEFAULT '[]',
        "metadata" TEXT NOT NULL DEFAULT '{}',
        "registered_at" TEXT NOT NULL,
        "last_seen_at" TEXT NOT NULL,
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
      )
    `);
    sqlite.run("CREATE INDEX \"idx_local_hosts_user_id\" ON \"local_hosts\" (\"user_id\")");
    sqlite.run("CREATE INDEX \"idx_local_hosts_organization_id\" ON \"local_hosts\" (\"organization_id\")");
    sqlite.run("CREATE INDEX \"idx_local_hosts_device_id\" ON \"local_hosts\" (\"device_id\")");
    sqlite.run("CREATE INDEX \"idx_local_hosts_last_seen_at\" ON \"local_hosts\" (\"last_seen_at\")");
  }

  if (hasTable("local_hosts") && !hasColumn("local_hosts", "host_token")) {
    sqlite.run("ALTER TABLE local_hosts ADD COLUMN host_token TEXT NOT NULL DEFAULT ''");
  }

  if (!hasTable("local_host_pairings")) {
    sqlite.run(`
      CREATE TABLE "local_host_pairings" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "user_id" TEXT NOT NULL,
        "organization_id" TEXT,
        "expires_at" TEXT NOT NULL,
        "used_at" TEXT,
        "created_at" TEXT NOT NULL,
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON UPDATE no action ON DELETE no action
      )
    `);
    sqlite.run("CREATE INDEX \"idx_local_host_pairings_user_id\" ON \"local_host_pairings\" (\"user_id\")");
    sqlite.run("CREATE INDEX \"idx_local_host_pairings_expires_at\" ON \"local_host_pairings\" (\"expires_at\")");
  }
}
