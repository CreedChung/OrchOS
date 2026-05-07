import { useState, useEffect } from "react";
import ComponentFileViewer, { type ApiComponent } from "@/components/ui/file-viewer";
import { AsciiLoading } from "@/components/ui/ascii-loading";
import { m } from "@/paraglide/messages";

export type { ApiComponent };

export function ComponentFileViewerWrapper({ component }: { component: ApiComponent }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="min-h-[640px] rounded-2xl border border-border bg-card flex items-center justify-center">
          <AsciiLoading label={m.loading()} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <ComponentFileViewer component={component} />
    </div>
  );
}
