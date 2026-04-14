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
  sqlite.run("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL, repository_url TEXT, created_at TEXT NOT NULL)")
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
  try { sqlite.run("ALTER TABLE agents ADD COLUMN avatar_url TEXT") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS mcp_servers (id TEXT PRIMARY KEY, name TEXT NOT NULL, command TEXT NOT NULL, args TEXT NOT NULL DEFAULT '[]', env TEXT NOT NULL DEFAULT '{}', enabled TEXT NOT NULL DEFAULT 'true', scope TEXT NOT NULL DEFAULT 'global', project_id TEXT REFERENCES projects(id), organization_id TEXT REFERENCES organizations(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_mcp_servers_project_id ON mcp_servers(project_id)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_mcp_servers_organization_id ON mcp_servers(organization_id)") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, enabled TEXT NOT NULL DEFAULT 'true', scope TEXT NOT NULL DEFAULT 'global', project_id TEXT REFERENCES projects(id), organization_id TEXT REFERENCES organizations(id), source_type TEXT NOT NULL DEFAULT 'manual', source_url TEXT, install_path TEXT, manifest_path TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_skills_project_id ON skills(project_id)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_skills_organization_id ON skills(organization_id)") } catch {}
  try { sqlite.run("ALTER TABLE skills ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual'") } catch {}
  try { sqlite.run("ALTER TABLE skills ADD COLUMN source_url TEXT") } catch {}
  try { sqlite.run("ALTER TABLE skills ADD COLUMN install_path TEXT") } catch {}
  try { sqlite.run("ALTER TABLE skills ADD COLUMN manifest_path TEXT") } catch {}
  try { sqlite.run("ALTER TABLE projects ADD COLUMN repository_url TEXT") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT, project_id TEXT REFERENCES projects(id), agent_id TEXT REFERENCES agents(id), runtime_id TEXT REFERENCES runtimes(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, error TEXT, response_time TEXT, created_at TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS sandboxes (id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id), agent_type TEXT NOT NULL DEFAULT 'pi', status TEXT NOT NULL DEFAULT 'creating', created_at TEXT NOT NULL)") } catch {}
  try { sqlite.run("CREATE INDEX IF NOT EXISTS idx_sandboxes_project_id ON sandboxes(project_id)") } catch {}
  try { sqlite.run("CREATE TABLE IF NOT EXISTS runtimes (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, command TEXT NOT NULL, version TEXT, path TEXT, role TEXT NOT NULL, capabilities TEXT NOT NULL DEFAULT '[]', model TEXT NOT NULL, enabled TEXT NOT NULL DEFAULT 'true', current_model TEXT, status TEXT NOT NULL DEFAULT 'idle', registry_id TEXT)") } catch {}
  // Migrate existing runtime-like agents to runtimes table
  try {
    const existingRuntimes = sqlite.query("SELECT id FROM runtimes LIMIT 1").get()
    if (!existingRuntimes) {
      const runtimeAgents = sqlite.query("SELECT id, name, role, capabilities, status, model, enabled, cli_command, current_model, runtime_id FROM agents WHERE cli_command IS NOT NULL").all()
      for (const agent of runtimeAgents as any[]) {
        sqlite.run("INSERT OR IGNORE INTO runtimes (id, name, command, role, capabilities, model, enabled, current_model, status, registry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [agent.id, agent.name, agent.cli_command, agent.role, agent.capabilities, agent.model, agent.enabled, agent.current_model, agent.status, agent.runtime_id])
        // Update agents that reference this runtime to use the new runtime_id
        sqlite.run("UPDATE agents SET runtime_id = ? WHERE runtime_id = ?", [agent.id, agent.runtime_id || agent.id])
      }
      // Remove runtime-like agents from agents table (they now live in runtimes)
      sqlite.run("DELETE FROM agents WHERE cli_command IS NOT NULL AND runtime_id IN (SELECT id FROM runtimes)")
    }
  } catch {}
}
