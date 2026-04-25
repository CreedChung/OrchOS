import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { clerkPublishableKey, isClerkConfigured } from "@/lib/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!isClerkConfigured) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>;
}
