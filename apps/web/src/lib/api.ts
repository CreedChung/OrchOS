import { createClientOnlyFn } from "@tanstack/react-start";

type ClientApi = typeof import("./api.client")["api"];

const loadClientApi = createClientOnlyFn(async (): Promise<ClientApi> => {
  const { api } = await import("./api.client");
  return api;
});

export const api = new Proxy({} as ClientApi, {
  get(_target, property) {
    return async (...args: unknown[]) => {
      const clientApi = await loadClientApi();
      const value = clientApi[property as keyof ClientApi];

      if (typeof value !== "function") {
        return value;
      }

      return (value as (...fnArgs: unknown[]) => unknown)(...args);
    };
  },
});

export { normalizeConversationMessage, normalizeInboxThread, normalizeTrace } from "./api.normalizers";
export { isRecord, readString, resolveApiUrl } from "./api.shared";
export type * from "./api.types";
