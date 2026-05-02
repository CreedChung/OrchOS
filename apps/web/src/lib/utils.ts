import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Robot02Icon,
  TerminalIcon,
  CodeIcon,
  StarsIcon,
} from "@hugeicons/core-free-icons";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return "0ms";
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  if (durationMs < 60_000) {
    return `${(durationMs / 1000).toFixed(durationMs < 10_000 ? 1 : 0)}s`;
  }

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.floor((durationMs % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

const RUNTIME_ICONS: Record<string, string> = {
  "claude-code": "/runtimes/claudecode-color.svg",
  "claude code": "/runtimes/claudecode-color.svg",
  codex: "/runtimes/codex-color.svg",
  opencode: "/runtimes/opencode.svg",
  "gemini-cli": "/runtimes/gemini-color.svg",
  "gemini cli": "/runtimes/gemini-color.svg",
  "qwen-code": "/runtimes/qwen-color.svg",
  "qwen code": "/runtimes/qwen-color.svg",
  pi: "/runtimes/pi.svg",
  amp: "/runtimes/amp-color.svg",
};

export function getRuntimeIcon(agent: {
  id?: string;
  name: string;
  command?: string;
}): string | undefined {
  const keys = [
    agent.id?.toLowerCase(),
    agent.name.toLowerCase(),
    agent.command?.split(/\s+/)[0]?.toLowerCase(),
  ];
  for (const key of keys) {
    if (key && RUNTIME_ICONS[key]) return RUNTIME_ICONS[key];
  }
  return undefined;
}

const RUNTIME_ICON_COMPONENTS: Record<string, IconSvgElement> = {
  "claude-code": Robot02Icon,
  "claude code": Robot02Icon,
  codex: TerminalIcon,
  opencode: CodeIcon,
  "gemini-cli": StarsIcon,
  "gemini cli": StarsIcon,
  "qwen-code": Robot02Icon,
  "qwen code": Robot02Icon,
  pi: Robot02Icon,
  amp: TerminalIcon,
};

export function getRuntimeIconComponent(agent: {
  id?: string;
  name: string;
  command?: string;
}): IconSvgElement | undefined {
  const keys = [
    agent.id?.toLowerCase(),
    agent.name.toLowerCase(),
    agent.command?.split(/\s+/)[0]?.toLowerCase(),
  ];
  for (const key of keys) {
    if (key && RUNTIME_ICON_COMPONENTS[key]) return RUNTIME_ICON_COMPONENTS[key];
  }
  return undefined;
}
