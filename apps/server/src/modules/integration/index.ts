import { Elysia, t } from "elysia";
import { authPlugin, requireAuth } from "@/modules/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

interface IntegrationConfig {
  id: string;
  name: string;
  type: "github" | "gitlab";
  connected: boolean;
  accessToken?: string;
  apiUrl?: string;
  username?: string;
}

const INTEGRATION_KEY = "integrations";

const defaultIntegrations: IntegrationConfig[] = [
  { id: "github", name: "GitHub", type: "github", connected: false },
  { id: "gitlab", name: "GitLab", type: "gitlab", connected: false },
];

function getIntegrations(): IntegrationConfig[] {
  const row = db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get();
  if (!row) return defaultIntegrations;
  try {
    const stored = JSON.parse(row.value) as IntegrationConfig[];
    return defaultIntegrations.map((d) => {
      const found = stored.find((s) => s.id === d.id);
      return found ? { ...d, ...found } : d;
    });
  } catch {
    return defaultIntegrations;
  }
}

function saveIntegrations(integrations: IntegrationConfig[]): void {
  const existing = db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get();
  const value = JSON.stringify(integrations);
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, INTEGRATION_KEY)).run();
  } else {
    db.insert(settings).values({ key: INTEGRATION_KEY, value }).run();
  }
}

async function verifyGitHubToken(token: string): Promise<{ username: string } | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "OrchOS" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { username: data.login };
  } catch {
    return null;
  }
}

async function verifyGitLabToken(token: string, apiUrl: string): Promise<{ username: string } | null> {
  try {
    const res = await fetch(`${apiUrl}/api/v4/user`, {
      headers: { "Private-Token": token },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { username: data.username };
  } catch {
    return null;
  }
}

export const integrationController = new Elysia({ prefix: "/api/integrations" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get("/", () => {
    const integrations = getIntegrations();
    return integrations.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      connected: i.connected,
      username: i.username,
    }));
  })
  .post(
    "/:id/connect",
    async ({ params: { id }, body }) => {
      const integrations = getIntegrations();
      const integration = integrations.find((i) => i.id === id);
      if (!integration) throw new Error("Integration not found");

      let username: string | undefined;

      if (id === "github") {
        const result = await verifyGitHubToken(body.accessToken);
        if (!result) throw new Error("Invalid GitHub token");
        username = result.username;
      } else if (id === "gitlab") {
        const apiUrl = body.apiUrl || "https://gitlab.com";
        const result = await verifyGitLabToken(body.accessToken, apiUrl);
        if (!result) throw new Error("Invalid GitLab token");
        username = result.username;
        integration.apiUrl = apiUrl;
      }

      integration.connected = true;
      integration.accessToken = body.accessToken;
      integration.apiUrl = body.apiUrl;
      integration.username = username;

      saveIntegrations(integrations);

      return {
        id: integration.id,
        name: integration.name,
        type: integration.type,
        connected: true,
        username,
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        accessToken: t.String(),
        apiUrl: t.Optional(t.String()),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        type: t.String(),
        connected: t.Boolean(),
        username: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/:id/disconnect",
    ({ params: { id } }) => {
      const integrations = getIntegrations();
      const integration = integrations.find((i) => i.id === id);
      if (!integration) throw new Error("Integration not found");

      integration.connected = false;
      integration.accessToken = undefined;
      integration.username = undefined;

      saveIntegrations(integrations);

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Object({ success: t.Boolean() }),
    },
  )
  .get(
    "/:id/repos",
    async ({ params: { id } }) => {
      const integrations = getIntegrations();
      const integration = integrations.find((i) => i.id === id);
      if (!integration || !integration.connected || !integration.accessToken) {
        throw new Error("Integration not connected");
      }

      if (id === "github") {
        const res = await fetch("https://api.github.com/user/repos?per_page=100", {
          headers: { Authorization: `Bearer ${integration.accessToken}`, "User-Agent": "OrchOS" },
        });
        const data = await res.json();
        return data.map((r: any) => ({
          id: r.id,
          name: r.full_name,
          url: r.html_url,
          private: r.private,
        }));
      }

      if (id === "gitlab") {
        const apiUrl = integration.apiUrl || "https://gitlab.com";
        const res = await fetch(`${apiUrl}/api/v4/projects?per_page=100&owned=true`, {
          headers: { "Private-Token": integration.accessToken },
        });
        const data = await res.json();
        return data.map((r: any) => ({
          id: r.id,
          name: r.path_with_namespace,
          url: r.web_url,
          private: r.visibility === "private",
        }));
      }

      return [];
    },
    {
      params: t.Object({ id: t.String() }),
      response: t.Array(
        t.Object({
          id: t.Any(),
          name: t.String(),
          url: t.String(),
          private: t.Boolean(),
        }),
      ),
    },
  );
