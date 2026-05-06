import { useEffect } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { SignIn, SignedIn, SignedOut, useAuth } from "@clerk/clerk-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AuthPage } from "@/components/ui/auth-page";
import { isClerkConfigured } from "@/lib/auth";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function AuthTransitionMarker() {
  const { isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      sessionStorage.setItem("orch_auth_transition", "true");
    }
  }, [isSignedIn]);
  return null;
}

function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <AuthPage mode="signIn">
        <MissingClerkConfig />
      </AuthPage>
    );
  }

  return (
    <AuthProvider>
      <AuthTransitionMarker />
      <SignedIn>
        <Navigate to="/dashboard/creation" replace />
      </SignedIn>
      <SignedOut>
        <AuthPage mode="signIn">
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/dashboard/creation"
          />
        </AuthPage>
      </SignedOut>
    </AuthProvider>
  );
}

function MissingClerkConfig() {
  return (
    <div className="rounded-[calc(var(--radius-xl)*1.2)] border border-dashed border-border bg-muted/40 p-6">
      <p className="text-sm font-semibold text-foreground">Clerk is not configured yet.</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>.env.local</code> before using the
        sign-in flow.
      </p>
    </div>
  );
}
