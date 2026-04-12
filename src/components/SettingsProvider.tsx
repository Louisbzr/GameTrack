'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AppSettings {
  notifFriendActivity: boolean
  notifNewReleases:    boolean
  notifBadges:         boolean
  notifReviews:        boolean
  notifEmail:          boolean
  profilePublic:       boolean
  showActivity:        boolean
  showGameList:        boolean
  showStats:           boolean
  language:            string
  animationsEnabled:   boolean
  compactMode:         boolean
  autoplayTrailers:    boolean
  defaultPlatform:     string
  showPlaytime:        boolean
  spoilerWarnings:     boolean
  ratingScale:         string
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifFriendActivity: true,
  notifNewReleases:    true,
  notifBadges:         true,
  notifReviews:        false,
  notifEmail:          false,
  profilePublic:       true,
  showActivity:        true,
  showGameList:        true,
  showStats:           true,
  language:            'fr',
  animationsEnabled:   true,
  compactMode:         false,
  autoplayTrailers:    false,
  defaultPlatform:     'pc',
  showPlaytime:        true,
  spoilerWarnings:     true,
  ratingScale:         '5',
}

interface ContextValue {
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
}

const SettingsContext = createContext<ContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
})

export function useSettings() { return useContext(SettingsContext) }

export function SettingsProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const supabase = createClient()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  // Load from DB
  useEffect(() => {
    if (!userId) return
    supabase.from('profiles').select('settings').eq('id', userId).maybeSingle()
      .then(({ data }) => {
        if (data?.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...data.settings }
          setSettings(merged)
          applyToDOM(merged)
        }
      })
  }, [userId])

  function applyToDOM(s: AppSettings) {
    const html = document.documentElement
    // Animations
    html.classList.toggle('no-animations', !s.animationsEnabled)
    // Compact mode
    html.classList.toggle('compact', s.compactMode)
    // Language (html lang attr)
    html.setAttribute('lang', s.language)
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      applyToDOM(next)
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}