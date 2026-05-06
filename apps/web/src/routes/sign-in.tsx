import { useEffect } from "react";
import { Navigate, createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AuthPage } from "@/components/ui/auth-page";
import { SignInForm } from "@/components/ui/auth-forms";
import { isClerkConfigured } from "@/lib/auth";
import { m } from "@/paraglide/messages";

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
  const { isSignedIn } = useAuth();

  if (!isClerkConfigured()) {
    return (
      <AuthProvider>
        <AuthPage mode="signIn">
          <MissingClerkConfig />
        </AuthPage>
      </AuthProvider>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard/creation" replace />;
  }

  return (
    <AuthProvider>
      <AuthTransitionMarker />
      <AuthPage mode="signIn">
        <SignInForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {m.no_account()}{" "}
          <Link to="/sign-up" className="font-medium text-primary hover:underline">
            {m.sign_up()}
          </Link>
        </p>
      </AuthPage>
    </AuthProvider>
  );
}

function MissingClerkConfig() {
  return (
    <div className="rounded-[calc(var(--radius-xl)*1.2)] border border-dashed border-border bg-muted/40 p-6">
      <p className="text-sm font-semibold text-foreground">{m.not_configured_title()}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {m.not_configured_sign_in()}
      </p>
    </div>
  );
}
