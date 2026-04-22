import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLocale } from "@/paraglide/runtime";
import { initializeClientLocale } from "@/lib/i18n-runtime";
import { clerkPublishableKey, isClerkConfigured } from "@/lib/auth";

import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(function(){try{var raw=window.localStorage.getItem('orchos-ui');var mode='auto';if(raw){var parsed=JSON.parse(raw);if(parsed&&parsed.state&&parsed.state.theme){mode=parsed.state.theme}}var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

initializeClientLocale();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "OrchOS",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preload",
        href: "/hero.png",
        as: "image",
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">404</h1>
        <p className="text-sm text-muted-foreground mt-1">Page not found</p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex h-screen items-center justify-center px-6">
      <div className="max-w-lg rounded-xl border border-border bg-background p-6 text-left shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Application Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "An unexpected error occurred."}
        </p>
      </div>
    </div>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      void import("react-grab");
    }
  }, []);

  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        {isClerkConfigured ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>
            <TooltipProvider>{children}</TooltipProvider>
          </ClerkProvider>
        ) : (
          <TooltipProvider>{children}</TooltipProvider>
        )}
        <Scripts />
      </body>
    </html>
  );
}
