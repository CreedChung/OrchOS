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
  const [locale, setLocaleState] = useState(() => settings?.locale || getLocale())

  useEffect(() => {
    if (settings?.locale && settings.locale !== locale) {
      setLocaleState(settings.locale)
      paraglideSetLocale(settings.locale, { reload: false })
    }
  }, [settings?.locale])

  const setLocaleWithSync = useCallback(async (newLocale: string) => {
    paraglideSetLocale(newLocale, { reload: false })
    setLocaleState(newLocale)
    try {
      const updated = await api.updateSettings({ locale: newLocale })
      setSettings(updated)
    } catch (err) {
      console.error("Failed to sync locale to server:", err)
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
