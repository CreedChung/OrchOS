import { Navigate, createFileRoute } from "@tanstack/react-router";
import { SignUp, SignedIn, SignedOut } from "@clerk/clerk-react";
import { AuthPage } from "@/components/ui/auth-page";
import { isClerkConfigured } from "@/lib/auth";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  if (!isClerkConfigured) {
    return (
      <AuthPage mode="signUp">
        <MissingClerkConfig />
      </AuthPage>
    );
  }

  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      <SignedOut>
        <AuthPage mode="signUp">
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
          />
        </AuthPage>
      </SignedOut>
    </>
  );
}

function MissingClerkConfig() {
  return (
    <div className="rounded-[calc(var(--radius-xl)*1.2)] border border-dashed border-border bg-muted/40 p-6">
      <p className="text-sm font-semibold text-foreground">Clerk is not configured yet.</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>apps/web</code> before using the
        sign-up flow.
      </p>
    </div>
  );
}
