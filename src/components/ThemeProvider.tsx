'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    'light',
  setTheme: () => {},
  toggle:   () => {},
})

export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Init depuis localStorage — CSS est dark-first, on toggle la classe .light
  useEffect(() => {
    const stored = localStorage.getItem('gt-theme') as Theme | null
    const initial = stored ?? 'dark'
    setThemeState(initial)
    document.documentElement.classList.toggle('light', initial === 'light')
    document.documentElement.classList.toggle('dark',  initial === 'dark')
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('gt-theme', t)
    document.documentElement.classList.toggle('light', t === 'light')
    document.documentElement.classList.toggle('dark',  t === 'dark')
  }

  function toggle() { setTheme(theme === 'dark' ? 'light' : 'dark') }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

/* ── Script anti-flash à injecter dans <head> ── */
export const themeScript = `
(function(){
  try{
    var t=localStorage.getItem('gt-theme');
    if(t==='light') document.documentElement.classList.add('light');
    else document.documentElement.classList.add('dark');
  }catch(e){ document.documentElement.classList.add('dark'); }
})();
`

/* ── Bouton toggle simple ☀️ / 🌙 ── */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className={`w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-base transition-all hover:bg-surface dark:hover:bg-surface-dark text-ink-muted dark:text-ink-subtle hover:text-ink dark:hover:text-ink-dark ${className}`}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}