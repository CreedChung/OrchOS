/**
 * Standalone migration runner — applies generated SQL migrations.
 * Run `bun run db:generate` first to produce migration files from schema.ts.
 */
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as schema from "../db/schema";

const DB_PATH = process.env.CORTEX_DB_PATH || "cortex.db";
const DRIZZLE_DIR = new URL("../../../drizzle", import.meta.url).pathname;

const sqlite = new Database(DB_PATH);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

const db = drizzle(sqlite, { schema });

// Ensure the drizzle migrations tracking table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash text NOT NULL UNIQUE,
    created_at integer
  )
`);

// For existing databases that predate drizzle migrations:
// If all the original tables already exist, mark the initial migration as applied
// without actually running it, so future incremental migrations work correctly.
const hasExistingTables = sqlite
  .query("SELECT name FROM sqlite_master WHERE type='table' AND name='goals'")
  .get();
if (hasExistingTables) {
  const journal = JSON.parse(readFileSync(`${DRIZZLE_DIR}/meta/_journal.json`, "utf-8"));
  for (const entry of journal.entries) {
    const tag = entry.tag;
    const sql = readFileSync(`${DRIZZLE_DIR}/${tag}.sql`, "utf-8");
    const hash = createHash("sha256").update(sql).digest("hex");
    const existing = sqlite.query("SELECT id FROM __drizzle_migrations WHERE hash = ?").get(hash);
    if (!existing) {
      sqlite.run("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [
        hash,
        entry.when,
      ]);
      console.log(`Marked existing migration as applied: ${tag}`);
    }
  }
}

migrate(db, { migrationsFolder: DRIZZLE_DIR });

console.log("Migrations applied successfully");
sqlite.close();
