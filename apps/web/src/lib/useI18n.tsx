import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from "react"
import { getLocale, setLocale as paraglideSetLocale } from "#/paraglide/runtime"
import type { ControlSettings } from "#/lib/types"
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
  settings,
  onSettingsChange,
}: {
  children: ReactNode
  settings: ControlSettings | null
  onSettingsChange: (settings: ControlSettings) => void
}) {
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
    if (settings) {
      const updated = await api.updateSettings({ locale: newLocale })
      onSettingsChange(updated)
    }
  }, [settings, onSettingsChange])

  return (
    <I18nContext.Provider value={{ locale, setLocaleWithSync }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useLocale() {
  return useContext(I18nContext)
}
