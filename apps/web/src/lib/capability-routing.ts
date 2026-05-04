import type { SidebarView } from "@/lib/types";

export type CapabilityView = never;
export type CapabilityViewMode = "mine" | "market";

export function isCapabilityView(_view: SidebarView): _view is CapabilityView {
  return false;
}

export function getCapabilityPath(view: CapabilityView, mode: CapabilityViewMode): string {
  return mode === "market" ? "/dashboard" : "/dashboard";
}

export function getCapabilityModeFromPath(pathname: string, view: CapabilityView): CapabilityViewMode {
  void pathname;
  void view;
  return "mine";
}
