import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/sso-callback")({
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (isSignedIn) {
      sessionStorage.setItem("orch_auth_transition", "true");
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    void navigate({
      to: isSignedIn ? "/dashboard/creation" : "/sign-in",
      replace: true,
    });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-3 text-sm text-muted-foreground">{m.loading()}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size="lg" className="text-muted-foreground/70" />
      <p className="ml-3 text-sm text-muted-foreground">{m.loading()}</p>
    </div>
  );
}
