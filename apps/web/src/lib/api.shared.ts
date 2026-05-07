declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: () => Promise<string | null>;
      } | null;
    };
  }
}

function getServerBaseUrl() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:3000";
  }

  return window.location.origin;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export function resolveApiUrl(path: string) {
  return new URL(path, `${getServerBaseUrl()}/`).toString();
}
