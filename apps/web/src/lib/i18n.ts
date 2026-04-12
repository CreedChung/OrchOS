import { getLocale, setLocale } from "#/paraglide/runtime"
import { m } from "#/paraglide/messages"

export { getLocale, setLocale, m }

export const AVAILABLE_LOCALES = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
] as const

export function changeLocale(locale: string) {
  setLocale(locale, { reload: false })
}
