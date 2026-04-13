import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react"
import { getLocale, setLocale as paraglideSetLocale } from "#/paraglide/runtime"
import { useUIStore } from "#/lib/store"
import { api } from "#/lib/api"

interface I18nContextValue {
  locale: string
  setLocaleWithSync: (locale: string) => void
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocaleWithSync: () => {},
})

export function I18nProvider({
  children,
}: {
  children: ReactNode
}) {
  const settings = useUIStore((s) => s.settings)
  const setSettings = useUIStore((s) => s.setSettings)

  // Always start with Paraglide's getLocale() to match SSR output,
  // then sync from client settings in useEffect to avoid hydration mismatch
  const [locale, setLocaleState] = useState(() => getLocale())

  // Sync Paraglide to our locale
  useEffect(() => {
    if (locale && locale !== getLocale()) {
      paraglideSetLocale(locale, { reload: false })
    }
  }, [locale])

  // If settings change (e.g. from server fetch), sync to locale state
  useEffect(() => {
    if (settings?.locale && settings.locale !== locale) {
      setLocaleState(settings.locale)
    }
  }, [settings?.locale])

  const setLocaleWithSync = useCallback(async (newLocale: string) => {
    setLocaleState(newLocale)
    paraglideSetLocale(newLocale, { reload: false })
    try {
      const updated = await api.updateSettings({ locale: newLocale })
      setSettings(updated)
    } catch {
      // Server sync is optional — locale already updated locally
    }
  }, [setSettings])

  return (
    <I18nContext.Provider value={{ locale, setLocaleWithSync }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useLocale() {
  return useContext(I18nContext)
}
