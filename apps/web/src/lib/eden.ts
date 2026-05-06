import { treaty } from "@elysiajs/eden";

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
  if (typeof window === "undefined") {
    return "http://127.0.0.1:5173";
  }

  return window.location.origin;
}

export function createEdenClient() {
  return treaty(getServerBaseUrl()) as EdenClient;
}
