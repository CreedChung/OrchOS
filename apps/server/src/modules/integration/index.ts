import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { authPlugin, requireAuth } from "@/modules/auth";
import { db } from "@/db";
import { settings } from "@/db/schema";

type IntegrationType = "github" | "gitlab" | "google-calendar" | "gmail" | "smtp-imap";

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface MailServerConfig {
  host: string;
  port: number;
  secure: boolean;
}

interface SmtpImapConfig {
  email: string;
  displayName?: string;
  smtp: MailServerConfig;
  imap: MailServerConfig;
  username: string;
  password: string;
}

interface IntegrationAccount {
  id: string;
  label: string;
  email?: string;
  username?: string;
  scopes?: string[];
  connectedAt: string;
  oauth?: OAuthCredentials;
  smtpImap?: SmtpImapConfig;
}

interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  connected: boolean;
  accounts: IntegrationAccount[];
  accessToken?: string;
  apiUrl?: string;
  username?: string;
}

const INTEGRATION_KEY = "integrations";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_SCOPES = {
  calendar: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ],
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
  ],
} as const;

const defaultIntegrations: IntegrationConfig[] = [
  { id: "github", name: "GitHub", type: "github", connected: false, accounts: [] },
  { id: "gitlab", name: "GitLab", type: "gitlab", connected: false, accounts: [] },
  {
    id: "google-calendar",
    name: "Google Calendar",
    type: "google-calendar",
    connected: false,
    accounts: [],
  },
  { id: "gmail", name: "Gmail", type: "gmail", connected: false, accounts: [] },
  {
    id: "smtp-imap",
    name: "SMTP / IMAP",
    type: "smtp-imap",
    connected: false,
    accounts: [],
  },
];

function getIntegrations(): IntegrationConfig[] {
  const row = db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get();
  if (!row) return defaultIntegrations;

  try {
    const stored = JSON.parse(row.value) as IntegrationConfig[];
    return defaultIntegrations.map((base) => {
      const found = stored.find((item) => item.id === base.id);
      return found
        ? {
            ...base,
            ...found,
            accounts: Array.isArray(found.accounts) ? found.accounts : [],
            connected:
              typeof found.connected === "boolean"
                ? found.connected
                : Array.isArray(found.accounts) && found.accounts.length > 0,
          }
        : base;
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

function sanitizeIntegration(config: IntegrationConfig) {
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    connected: config.connected,
    username: config.username,
    apiUrl: config.apiUrl,
    accounts: config.accounts.map((account) => ({
      id: account.id,
      label: account.label,
      email: account.email,
      username: account.username,
      scopes: account.scopes ?? [],
      connectedAt: account.connectedAt,
      hasRefreshToken: Boolean(account.oauth?.refreshToken),
      hasPassword: Boolean(account.smtpImap?.password),
      smtpHost: account.smtpImap?.smtp.host,
      imapHost: account.smtpImap?.imap.host,
    })),
  };
}

function requireIntegration(integrations: IntegrationConfig[], id: string): IntegrationConfig {
  const integration = integrations.find((item) => item.id === id);
  if (!integration) {
    throw new Error("Integration not found");
  }

  return integration;
}

function recomputeConnectionState(integration: IntegrationConfig) {
  integration.connected = integration.accounts.length > 0 || Boolean(integration.accessToken);
}

function createAccountId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function verifyGitHubToken(token: string): Promise<{ username: string } | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "OrchOS" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { login?: string };
    return data.login ? { username: data.login } : null;
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
    const data = (await res.json()) as { username?: string };
    return data.username ? { username: data.username } : null;
  } catch {
    return null;
  }
}

async function exchangeGoogleRefreshToken(
  credentials: OAuthCredentials,
): Promise<{ accessToken: string; scopes: string[] }> {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Google refresh token");
  }

  const payload = (await response.json()) as {
    access_token?: string;
    scope?: string;
  };

  if (!payload.access_token) {
    throw new Error("Google token response did not include an access token");
  }

  return {
    accessToken: payload.access_token,
    scopes: payload.scope?.split(" ").filter(Boolean) ?? [],
  };
}

async function fetchGoogleProfile(accessToken: string): Promise<{ email: string; label: string }> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google account profile");
  }

  const payload = (await response.json()) as {
    email?: string;
    name?: string;
  };

  return {
    email: payload.email ?? "",
    label: payload.name?.trim() || payload.email?.trim() || "Google account",
  };
}

function ensureScopes(actual: string[], required: readonly string[]) {
  return required.every((scope) => actual.includes(scope));
}

function validateSmtpImapConfig(config: SmtpImapConfig) {
  if (!config.email.trim()) {
    throw new Error("Email is required");
  }

  if (!config.username.trim()) {
    throw new Error("Username is required");
  }

  if (!config.password.trim()) {
    throw new Error("Password is required");
  }

  if (!config.smtp.host.trim() || !config.imap.host.trim()) {
    throw new Error("SMTP and IMAP host are required");
  }

  if (config.smtp.port <= 0 || config.imap.port <= 0) {
    throw new Error("SMTP and IMAP ports must be positive numbers");
  }
}

const integrationSummaryResponse = t.Object({
  id: t.String(),
  name: t.String(),
  type: t.String(),
  connected: t.Boolean(),
  username: t.Optional(t.String()),
  apiUrl: t.Optional(t.String()),
  accounts: t.Array(
    t.Object({
      id: t.String(),
      label: t.String(),
      email: t.Optional(t.String()),
      username: t.Optional(t.String()),
      scopes: t.Array(t.String()),
      connectedAt: t.String(),
      hasRefreshToken: t.Boolean(),
      hasPassword: t.Boolean(),
      smtpHost: t.Optional(t.String()),
      imapHost: t.Optional(t.String()),
    }),
  ),
});

export const integrationController = new Elysia({ prefix: "/api/integrations" })
  .use(authPlugin)
  .onBeforeHandle(requireAuth)
  .get(
    "/",
    () => getIntegrations().map(sanitizeIntegration),
    { response: t.Array(integrationSummaryResponse) },
  )
  .post(
    "/:id/connect",
    async ({ params: { id }, body }) => {
      const integrations = getIntegrations();
      const integration = requireIntegration(integrations, id);

      if (id === "github") {
        const result = await verifyGitHubToken(body.accessToken);
        if (!result) throw new Error("Invalid GitHub token");
        integration.connected = true;
        integration.accessToken = body.accessToken;
        integration.username = result.username;
      } else if (id === "gitlab") {
        const apiUrl = body.apiUrl || "https://gitlab.com";
        const result = await verifyGitLabToken(body.accessToken, apiUrl);
        if (!result) throw new Error("Invalid GitLab token");
        integration.connected = true;
        integration.accessToken = body.accessToken;
        integration.apiUrl = apiUrl;
        integration.username = result.username;
      } else {
        throw new Error("Direct token connection is not supported for this integration");
      }

      saveIntegrations(integrations);
      return sanitizeIntegration(integration);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        accessToken: t.String(),
        apiUrl: t.Optional(t.String()),
      }),
      response: integrationSummaryResponse,
    },
  )
  .post(
    "/google/:id/accounts",
    async ({ params: { id }, body }) => {
      if (id !== "google-calendar" && id !== "gmail") {
        throw new Error("Unsupported Google integration");
      }

      const integrations = getIntegrations();
      const integration = requireIntegration(integrations, id);
      const credentials: OAuthCredentials = {
        clientId: body.clientId.trim(),
        clientSecret: body.clientSecret.trim(),
        refreshToken: body.refreshToken.trim(),
      };

      const { accessToken, scopes } = await exchangeGoogleRefreshToken(credentials);
      const requiredScopes =
        id === "google-calendar" ? GOOGLE_OAUTH_SCOPES.calendar : GOOGLE_OAUTH_SCOPES.gmail;

      if (!ensureScopes(scopes, requiredScopes)) {
        throw new Error("Google account is missing required scopes");
      }

      const profile = await fetchGoogleProfile(accessToken);
      const account: IntegrationAccount = {
        id: createAccountId(id),
        label: body.label?.trim() || profile.label,
        email: profile.email,
        username: profile.email,
        scopes,
        connectedAt: new Date().toISOString(),
        oauth: credentials,
      };

      const existingIndex = integration.accounts.findIndex((item) => item.email === profile.email);
      if (existingIndex >= 0) {
        integration.accounts[existingIndex] = account;
      } else {
        integration.accounts.push(account);
      }

      integration.accessToken = accessToken;
      integration.username = profile.email;
      recomputeConnectionState(integration);
      saveIntegrations(integrations);

      return sanitizeIntegration(integration);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        clientId: t.String(),
        clientSecret: t.String(),
        refreshToken: t.String(),
        label: t.Optional(t.String()),
      }),
      response: integrationSummaryResponse,
    },
  )
  .post(
    "/smtp-imap/accounts",
    ({ body }) => {
      const integrations = getIntegrations();
      const integration = requireIntegration(integrations, "smtp-imap");
      const account: IntegrationAccount = {
        id: createAccountId("smtp-imap"),
        label: body.displayName?.trim() || body.email.trim(),
        email: body.email.trim(),
        username: body.username.trim(),
        connectedAt: new Date().toISOString(),
        smtpImap: {
          email: body.email.trim(),
          displayName: body.displayName?.trim(),
          username: body.username.trim(),
          password: body.password,
          smtp: {
            host: body.smtp.host.trim(),
            port: body.smtp.port,
            secure: body.smtp.secure,
          },
          imap: {
            host: body.imap.host.trim(),
            port: body.imap.port,
            secure: body.imap.secure,
          },
        },
      };

      validateSmtpImapConfig(account.smtpImap);

      const existingIndex = integration.accounts.findIndex((item) => item.email === account.email);
      if (existingIndex >= 0) {
        integration.accounts[existingIndex] = account;
      } else {
        integration.accounts.push(account);
      }

      integration.username = account.email;
      recomputeConnectionState(integration);
      saveIntegrations(integrations);

      return sanitizeIntegration(integration);
    },
    {
      body: t.Object({
        email: t.String(),
        displayName: t.Optional(t.String()),
        username: t.String(),
        password: t.String(),
        smtp: t.Object({
          host: t.String(),
          port: t.Number(),
          secure: t.Boolean(),
        }),
        imap: t.Object({
          host: t.String(),
          port: t.Number(),
          secure: t.Boolean(),
        }),
      }),
      response: integrationSummaryResponse,
    },
  )
  .delete(
    "/:id/accounts/:accountId",
    ({ params: { id, accountId } }) => {
      const integrations = getIntegrations();
      const integration = requireIntegration(integrations, id);
      integration.accounts = integration.accounts.filter((account) => account.id !== accountId);
      if (integration.accounts.length === 0) {
        integration.accessToken = undefined;
        integration.username = undefined;
      }
      recomputeConnectionState(integration);
      saveIntegrations(integrations);
      return sanitizeIntegration(integration);
    },
    {
      params: t.Object({ id: t.String(), accountId: t.String() }),
      response: integrationSummaryResponse,
    },
  )
  .post(
    "/:id/disconnect",
    ({ params: { id } }) => {
      const integrations = getIntegrations();
      const integration = requireIntegration(integrations, id);
      integration.connected = false;
      integration.accessToken = undefined;
      integration.apiUrl = undefined;
      integration.username = undefined;
      integration.accounts = [];
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
      const integration = requireIntegration(integrations, id);
      if (!integration.connected || !integration.accessToken) {
        throw new Error("Integration not connected");
      }

      if (id === "github") {
        const res = await fetch("https://api.github.com/user/repos?per_page=100", {
          headers: { Authorization: `Bearer ${integration.accessToken}`, "User-Agent": "OrchOS" },
        });
        const data = (await res.json()) as Array<{
          id: number;
          full_name: string;
          html_url: string;
          private: boolean;
        }>;
        return data.map((repo) => ({
          id: repo.id,
          name: repo.full_name,
          url: repo.html_url,
          private: repo.private,
        }));
      }

      if (id === "gitlab") {
        const apiUrl = integration.apiUrl || "https://gitlab.com";
        const res = await fetch(`${apiUrl}/api/v4/projects?per_page=100&owned=true`, {
          headers: { "Private-Token": integration.accessToken },
        });
        const data = (await res.json()) as Array<{
          id: number;
          path_with_namespace: string;
          web_url: string;
          visibility: string;
        }>;
        return data.map((repo) => ({
          id: repo.id,
          name: repo.path_with_namespace,
          url: repo.web_url,
          private: repo.visibility === "private",
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
