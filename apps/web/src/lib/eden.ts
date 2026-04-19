import { treaty } from "@elysiajs/eden";
import type { App as ServerApp } from "@server-app/index";

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() ?? import.meta.env.VITE_API_BASE?.trim() ?? "";

export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

export function getServerBaseUrl() {
  if (API_BASE) {
    return API_BASE;
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:5173";
  }

  const url = new URL(window.location.origin);
  url.port = "5173";
  return url.origin;
}

export function createEdenClient() {
  return treaty<ServerApp>(getServerBaseUrl());
}
