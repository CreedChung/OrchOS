import { treaty } from "@elysiajs/eden";

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() ?? import.meta.env.VITE_API_BASE?.trim() ?? "";

export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

type EdenClient = ReturnType<typeof treaty> & {
  api: any;
  ws: {
    subscribe: () => {
      on: (event: string, handler: (...args: any[]) => void) => void;
      subscribe: (handler: (event: { data: unknown }) => void) => void;
      close: () => void;
    };
  };
};

export function getServerBaseUrl() {
  if (API_BASE) {
    return API_BASE;
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5173";
  }

  return window.location.origin;
}

export function createEdenClient() {
  return treaty(getServerBaseUrl()) as EdenClient;
}
