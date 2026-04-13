"use client"

import { useState, useEffect } from "react"
import ComponentFileViewer, { type ApiComponent } from "#/components/ui/file-viewer"

export function ComponentFileViewerWrapper({ component }: { component: ApiComponent }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="min-h-[640px] rounded-2xl border border-border bg-card flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <ComponentFileViewer component={component} />
    </div>
  )
}
