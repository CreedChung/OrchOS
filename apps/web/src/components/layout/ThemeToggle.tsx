import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { m } from "#/paraglide/messages"

type ThemeMode = 'light' | 'dark' | 'auto'

const themeOptions: { mode: ThemeMode; icon: typeof Sun; labelKey: string }[] = [
  { mode: 'light', icon: Sun, labelKey: 'theme_light' },
  { mode: 'dark', icon: Moon, labelKey: 'theme_dark' },
  { mode: 'auto', icon: Monitor, labelKey: 'theme_system' },
]

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'auto'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  document.documentElement.style.colorScheme = resolved
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function setThemeMode(newMode: ThemeMode) {
    setMode(newMode)
    applyThemeMode(newMode)
    window.localStorage.setItem('theme', newMode)
  }

  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {themeOptions.map(({ mode: optMode, icon: Icon, labelKey }) => {
        const label = (m as Record<string, () => string>)[labelKey]()
        return (
          <button
            key={optMode}
            type="button"
            onClick={() => setThemeMode(optMode)}
            aria-label={m.theme_switch_mode({ label })}
            title={m.theme_switch_mode({ label })}
            className={`flex flex-1 items-center justify-center rounded-md py-1.5 transition-all ${
              mode === optMode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
