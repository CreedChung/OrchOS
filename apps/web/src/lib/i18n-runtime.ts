import {
  baseLocale,
  getLocale as getParaglideLocale,
  overwriteGetLocale,
  setLocale as setParaglideLocale,
} from "@/paraglide/runtime";

let activeLocale = baseLocale;
let clientLocaleInitialized = false;

export function initializeClientLocale() {
  if (typeof document === "undefined" || clientLocaleInitialized) {
    return;
  }

  activeLocale = document.documentElement.lang || baseLocale;
  overwriteGetLocale(() => activeLocale);
  clientLocaleInitialized = true;
}

export function getInitialLocale() {
  if (typeof window === "undefined") {
    return getParaglideLocale();
  }

  initializeClientLocale();
  return activeLocale;
}

export function syncRuntimeLocale(locale: string) {
  activeLocale = locale;
  setParaglideLocale(locale, { reload: false });
}
