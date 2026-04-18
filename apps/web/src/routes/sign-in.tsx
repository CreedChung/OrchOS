import { Navigate, createFileRoute } from "@tanstack/react-router";
import { SignIn, SignedIn, SignedOut } from "@clerk/clerk-react";
import { AuthPage } from "@/components/ui/auth-page";
import { isClerkConfigured } from "@/lib/auth";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      <SignedOut>
        <AuthPage mode="signIn">
          {isClerkConfigured ? (
            <SignIn
              path="/sign-in"
              routing="path"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/dashboard"
            />
          ) : (
            <MissingClerkConfig />
          )}
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
        sign-in flow.
      </p>
    </div>
  );
}
