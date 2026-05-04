import type { AvatarFullConfig } from "react-nice-avatar";

const NICE_AVATAR_PREFIX = "nice-avatar:";

export function encodeNiceAvatar(config: AvatarFullConfig): string {
  return `${NICE_AVATAR_PREFIX}${encodeURIComponent(JSON.stringify(config))}`;
}

export function decodeNiceAvatar(value?: string): AvatarFullConfig | null {
  if (!value?.startsWith(NICE_AVATAR_PREFIX)) return null;

  try {
    const json = decodeURIComponent(value.slice(NICE_AVATAR_PREFIX.length));
    return JSON.parse(json) as AvatarFullConfig;
  } catch {
    return null;
  }
}

export function isNiceAvatar(value?: string): boolean {
  return Boolean(decodeNiceAvatar(value));
}
