declare module "@/paraglide/messages" {
  export * from "../paraglide/messages/_index.js";
  export const m: typeof import("../paraglide/messages/_index.js");
}

declare module "@/paraglide/runtime" {
  export const baseLocale: string;
  export function getLocale(): string;
  export function setLocale(locale: string, options?: { reload?: boolean }): void;
  export function overwriteGetLocale(fn: () => string): void;
}
