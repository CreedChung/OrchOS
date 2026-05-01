import type { SidebarView } from "@/lib/types";

export type CapabilityView = Extract<SidebarView, "mcp-servers" | "skills">;
export type CapabilityViewMode = "mine" | "market";

export function isCapabilityView(view: SidebarView): view is CapabilityView {
  return view === "mcp-servers" || view === "skills";
}

export function getCapabilityPath(view: CapabilityView, mode: CapabilityViewMode): string {
  const basePath = view === "mcp-servers" ? "/dashboard/mcp-servers" : "/dashboard/skills";
  return mode === "market" ? `${basePath}/market` : basePath;
}

export function getCapabilityModeFromPath(pathname: string, view: CapabilityView): CapabilityViewMode {
  const basePath = getCapabilityPath(view, "mine");
  return pathname === basePath ? "mine" : "market";
}
