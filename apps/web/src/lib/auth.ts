import { getPublicRuntimeConfig } from "./public-runtime-config";

export function getClerkPublishableKey() {
  return getPublicRuntimeConfig().clerkPublishableKey;
}

export function isClerkConfigured() {
  return getClerkPublishableKey().length > 0;
}
