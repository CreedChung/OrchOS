import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db/types";
import { settings } from "@/server/db/schema";

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
  { id: "google-calendar", name: "Google Calendar", type: "google-calendar", connected: false, accounts: [] },
  { id: "gmail", name: "Gmail", type: "gmail", connected: false, accounts: [] },
  { id: "smtp-imap", name: "SMTP / IMAP", type: "smtp-imap", connected: false, accounts: [] },
];

export class IntegrationService {
  constructor(private db: AppDb) {}

  private async getIntegrations(): Promise<IntegrationConfig[]> {
    const row = (await this.db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get()) as
      | { key: string; value: string }
      | undefined;
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

  private async saveIntegrations(integrations: IntegrationConfig[]) {
    const existing = (await this.db.select().from(settings).where(eq(settings.key, INTEGRATION_KEY)).get()) as
      | { key: string; value: string }
      | undefined;
    const value = JSON.stringify(integrations);

    if (existing) {
      this.db.update(settings).set({ value }).where(eq(settings.key, INTEGRATION_KEY)).run();
    } else {
      this.db.insert(settings).values({ key: INTEGRATION_KEY, value }).run();
    }
  }

  private sanitizeIntegration(config: IntegrationConfig) {
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

  private requireIntegration(integrations: IntegrationConfig[], id: string) {
    const integration = integrations.find((item) => item.id === id);
    if (!integration) {
      throw new Error("Integration not found");
    }
    return integration;
  }

  private recomputeConnectionState(integration: IntegrationConfig) {
    integration.connected = integration.accounts.length > 0 || Boolean(integration.accessToken);
  }

  private createAccountId(prefix: string) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private async verifyGitHubToken(token: string): Promise<{ username: string } | null> {
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

  private async verifyGitLabToken(token: string, apiUrl: string): Promise<{ username: string } | null> {
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

  private async exchangeGoogleRefreshToken(credentials: OAuthCredentials): Promise<{ accessToken: string; scopes: string[] }> {
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

    const payload = (await response.json()) as { access_token?: string; scope?: string };
    if (!payload.access_token) {
      throw new Error("Google token response did not include an access token");
    }

    return {
      accessToken: payload.access_token,
      scopes: payload.scope?.split(" ").filter(Boolean) ?? [],
    };
  }

  private async fetchGoogleProfile(accessToken: string): Promise<{ email: string; label: string }> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Google account profile");
    }

    const payload = (await response.json()) as { email?: string; name?: string };
    return {
      email: payload.email ?? "",
      label: payload.name?.trim() || payload.email?.trim() || "Google account",
    };
  }

  private ensureScopes(actual: string[], required: readonly string[]) {
    return required.every((scope) => actual.includes(scope));
  }

  private validateSmtpImapConfig(config: SmtpImapConfig) {
    if (!config.email.trim()) throw new Error("Email is required");
    if (!config.username.trim()) throw new Error("Username is required");
    if (!config.password.trim()) throw new Error("Password is required");
    if (!config.smtp.host.trim() || !config.imap.host.trim()) throw new Error("SMTP and IMAP host are required");
    if (config.smtp.port <= 0 || config.imap.port <= 0) throw new Error("SMTP and IMAP ports must be positive numbers");
  }

  async listIntegrations() {
    return (await this.getIntegrations()).map((item) => this.sanitizeIntegration(item));
  }

  async connectIntegration(id: "github" | "gitlab", body: { accessToken: string; apiUrl?: string }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);

    if (id === "github") {
      const result = await this.verifyGitHubToken(body.accessToken);
      if (!result) throw new Error("Invalid GitHub token");
      integration.connected = true;
      integration.accessToken = body.accessToken;
      integration.username = result.username;
    } else {
      const apiUrl = body.apiUrl || "https://gitlab.com";
      const result = await this.verifyGitLabToken(body.accessToken, apiUrl);
      if (!result) throw new Error("Invalid GitLab token");
      integration.connected = true;
      integration.accessToken = body.accessToken;
      integration.apiUrl = apiUrl;
      integration.username = result.username;
    }

    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async connectGoogleIntegration(id: "google-calendar" | "gmail", body: { clientId: string; clientSecret: string; refreshToken: string; label?: string }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    const credentials: OAuthCredentials = {
      clientId: body.clientId.trim(),
      clientSecret: body.clientSecret.trim(),
      refreshToken: body.refreshToken.trim(),
    };

    const { accessToken, scopes } = await this.exchangeGoogleRefreshToken(credentials);
    const requiredScopes = id === "google-calendar" ? GOOGLE_OAUTH_SCOPES.calendar : GOOGLE_OAUTH_SCOPES.gmail;

    if (!this.ensureScopes(scopes, requiredScopes)) {
      throw new Error("Google account is missing required scopes");
    }

    const profile = await this.fetchGoogleProfile(accessToken);
    const account: IntegrationAccount = {
      id: this.createAccountId(id),
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
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async createSmtpImapAccount(body: {
    email: string;
    displayName?: string;
    username: string;
    password: string;
    smtp: { host: string; port: number; secure: boolean };
    imap: { host: string; port: number; secure: boolean };
  }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, "smtp-imap");
    const account: IntegrationAccount = {
      id: this.createAccountId("smtp-imap"),
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

    if (!account.smtpImap) {
      throw new Error("SMTP / IMAP configuration is required");
    }

    this.validateSmtpImapConfig(account.smtpImap);
    const existingIndex = integration.accounts.findIndex((item) => item.email === account.email);
    if (existingIndex >= 0) {
      integration.accounts[existingIndex] = account;
    } else {
      integration.accounts.push(account);
    }

    integration.username = account.email;
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async updateIntegrationAccount(id: string, accountId: string, data: { label?: string; email?: string; username?: string }) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    const account = integration.accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);
    if (data.label !== undefined) account.label = data.label;
    if (data.email !== undefined) account.email = data.email;
    if (data.username !== undefined) account.username = data.username;
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async deleteIntegrationAccount(id: string, accountId: string) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    integration.accounts = integration.accounts.filter((account) => account.id !== accountId);
    if (integration.accounts.length === 0) {
      integration.accessToken = undefined;
      integration.username = undefined;
    }
    this.recomputeConnectionState(integration);
    await this.saveIntegrations(integrations);
    return this.sanitizeIntegration(integration);
  }

  async disconnectIntegration(id: string) {
    const integrations = await this.getIntegrations();
    const integration = this.requireIntegration(integrations, id);
    integration.connected = false;
    integration.accessToken = undefined;
    integration.apiUrl = undefined;
    integration.username = undefined;
    integration.accounts = [];
    await this.saveIntegrations(integrations);
    return { success: true };
  }
}
