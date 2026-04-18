export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ?? "";

export const isClerkConfigured = clerkPublishableKey.length > 0;
