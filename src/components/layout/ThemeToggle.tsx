'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
    >
      {theme === 'dark'
        ? <Sun  className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}