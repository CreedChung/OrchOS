import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RUNTIME_ICONS: Record<string, string> = {
  "claude-code": "/runtime/claudecode-color.svg",
  "claude code": "/runtime/claudecode-color.svg",
  codex: "/runtime/codex-color.svg",
  opencode: "/runtime/opencode.svg",
  "gemini-cli": "/runtime/gemini-color.svg",
  "gemini cli": "/runtime/gemini-color.svg",
  "qwen-code": "/runtime/qwen-color.svg",
  "qwen code": "/runtime/qwen-color.svg",
  pi: "/runtime/pi.svg",
  amp: "/runtime/amp-color.svg",
};

export function getRuntimeIcon(agent: { id?: string; name: string; command?: string }): string | undefined {
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
