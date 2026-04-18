import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:5173";

function getBackendBaseUrl() {
  return (
    process.env.ORCHOS_SERVER_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.API_BASE_URL?.trim() ||
    DEFAULT_BACKEND_URL
  ).replace(/\/+$/, "");
}

async function handle({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const targetUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}`,
    `${getBackendBaseUrl()}/`,
  );
  const headers = new Headers(request.headers);

  headers.delete("host");

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    redirect: "manual",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: new Headers(upstream.headers),
  });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
