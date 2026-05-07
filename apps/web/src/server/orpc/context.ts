import { authenticateRequest } from "@/server/auth/request-auth";

export interface ORPCContext {
  request: Request;
  headers: Headers;
}

function getJwtKey() {
  return process.env.CLERK_SECRET_KEY?.trim() ?? "";
}

export function isClerkConfigured() {
  return getJwtKey().length > 0;
}

export async function authenticateORPCRequest(request: Request) {
  return authenticateRequest(request, getJwtKey());
}

export function extractBearerToken(request: Request) {
  const authHeader = request.headers.get("Authorization")?.trim();
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
