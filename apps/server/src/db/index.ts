import { Database } from "bun:sqlite"
import { drizzle } from "drizzle-orm/bun-sqlite"
import * as schema from "./schema"

const DB_PATH = process.env.CORTEX_DB_PATH || "cortex.db"

const sqlite = new Database(DB_PATH, { create: true })
sqlite.exec("PRAGMA journal_mode = WAL")
sqlite.exec("PRAGMA foreign_keys = ON")

migrate(sqlite)

export const db = drizzle(sqlite, { schema })

function migrate(sqlite: Database) {
  sqlite.run("CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, instruction TEXT NOT NULL, agent_names TEXT NOT NULL DEFAULT '[]', project_ids TEXT NOT NULL DEFAULT '[]', goal_id TEXT REFERENCES goals(id), status TEXT NOT NULL DEFAULT 'sent', created_at TEXT NOT NULL)")
  sqlite.run("CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, success_criteria TEXT NOT NULL DEFAULT '[]', constraints TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'active', project_id TEXT, command_id TEXT REFERENCES commands(id), watchers TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (project_id) REFERENCES projects(id))")
  sqlite.run("CREATE TABLE IF NOT EXISTS states (id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', actions TEXT, updated_at TEXT NOT NULL, FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE)")
  sqlite.run("CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', detail TEXT, updated_at TEXT NOT NULL, FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE)")
  sqlite.run("CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, timestamp TEXT NOT NULL, agent TEXT NOT NULL, action TEXT NOT NULL, detail TEXT, reasoning TEXT, diff TEXT)")
  sqlite.run("CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, role TEXT NOT NULL, capabilities TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'idle', model TEXT NOT NULL, enabled TEXT NOT NULL DEFAULT 'true')")
  sqlite.run("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL)")
  sqlite.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
  sqlite.run("CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, type TEXT NOT NULL, goal_id TEXT, payload TEXT NOT NULL DEFAULT '{}', timestamp TEXT NOT NULL)")
  sqlite.run("CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL)")
  sqlite.run("CREATE TABLE IF NOT EXISTS problems (id TEXT PRIMARY KEY, title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'warning', source TEXT, context TEXT, goal_id TEXT, state_id TEXT, status TEXT NOT NULL DEFAULT 'open', actions TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)")
  sqlite.run("CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, condition TEXT NOT NULL, action TEXT NOT NULL, enabled TEXT NOT NULL DEFAULT 'true', created_at TEXT NOT NULL)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_commands_goal_id ON commands(goal_id)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_states_goal_id ON states(goal_id)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_artifacts_goal_id ON artifacts(goal_id)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_activities_goal_id ON activities(goal_id)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_events_goal_id ON events(goal_id)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status)")
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_problems_goal_id ON problems(goal_id)")

  // Migrations
  try { sqlite.run("ALTER TABLE agents ADD COLUMN enabled TEXT NOT NULL DEFAULT 'true'") } catch {}
  try { sqlite.run("ALTER TABLE goals ADD COLUMN project_id TEXT REFERENCES projects(id)") } catch {}
  try { sqlite.run("ALTER TABLE goals ADD COLUMN command_id TEXT REFERENCES commands(id)") } catch {}
  try { sqlite.run("ALTER TABLE goals ADD COLUMN watchers TEXT NOT NULL DEFAULT '[]'") } catch {}
  try { sqlite.run("ALTER TABLE activities ADD COLUMN diff TEXT") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS problems (id TEXT PRIMARY KEY, title TEXT NOT NULL, priority TEXT NOT NULL DEFAULT 'warning', source TEXT, context TEXT, goal_id TEXT, state_id TEXT, status TEXT NOT NULL DEFAULT 'open', actions TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY, name TEXT NOT NULL, condition TEXT NOT NULL, action TEXT NOT NULL, enabled TEXT NOT NULL DEFAULT 'true', created_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_problems_goal_id ON problems(goal_id)") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, instruction TEXT NOT NULL, agent_names TEXT NOT NULL DEFAULT '[]', project_ids TEXT NOT NULL DEFAULT '[]', goal_id TEXT REFERENCES goals(id), status TEXT NOT NULL DEFAULT 'sent', created_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_commands_goal_id ON commands(goal_id)") } catch {}
  try { sqlite.run("ALTER TABLE agents ADD COLUMN cli_command TEXT") } catch {}
  try { sqlite.run("ALTER TABLE agents ADD COLUMN current_model TEXT") } catch {}
  try { sqlite.run("ALTER TABLE agents ADD COLUMN runtime_id TEXT") } catch {}
}
