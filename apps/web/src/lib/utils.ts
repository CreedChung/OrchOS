import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
