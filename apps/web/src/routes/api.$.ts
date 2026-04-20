import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_BACKEND_URL = "http://127.0.0.1:5173";
const GITHUB_REPO_API_URL = "https://api.github.com/repos/CreedChung/OrchOS";
const GITHUB_STARS_CACHE_TTL_MS = 1000 * 60 * 30;

let githubStarsCache: {
  value: number;
  expiresAt: number;
} | null = null;

function getBackendBaseUrl() {
  return (
    process.env.ORCHOS_SERVER_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.API_BASE_URL?.trim() ||
    DEFAULT_BACKEND_URL
  ).replace(/\/+$/, "");
}

async function handleGithubStars() {
  const now = Date.now();

  if (githubStarsCache && githubStarsCache.expiresAt > now) {
    return Response.json(
      { stargazers_count: githubStarsCache.value, cached: true },
      {
        headers: {
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
        },
      },
    );
  }

  const response = await fetch(GITHUB_REPO_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "OrchOS-Web",
    },
  });

  if (!response.ok) {
    if (githubStarsCache) {
      return Response.json(
        { stargazers_count: githubStarsCache.value, cached: true, stale: true },
        {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
          },
        },
      );
    }

    return Response.json({ error: "Failed to load GitHub stars" }, { status: 502 });
  }

  const data = (await response.json()) as { stargazers_count?: number };
  const starCount = typeof data.stargazers_count === "number" ? data.stargazers_count : null;

  if (starCount === null) {
    return Response.json({ error: "Invalid GitHub stars response" }, { status: 502 });
  }

  githubStarsCache = {
    value: starCount,
    expiresAt: now + GITHUB_STARS_CACHE_TTL_MS,
  };

  return Response.json(
    { stargazers_count: starCount, cached: false },
    {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    },
  );
}

async function handle({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);

  if (request.method === "GET" && requestUrl.pathname === "/api/github-stars") {
    return handleGithubStars();
  }

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
