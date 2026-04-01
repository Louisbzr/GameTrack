import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Playfair_Display } from 'next/font/google'
import { ThemeProvider, themeScript } from '@/components/ThemeProvider'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const playfair = Playfair_Display({
  subsets:  ['latin'],
  variable: '--font-playfair',
  style:    ['normal', 'italic'],
  weight:   ['600', '700', '900'],
  display:  'swap',
})

export const metadata: Metadata = {
  title:       'GameTrack',
  description: 'Ton journal de jeu vidéo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Injecté avant le premier paint → zéro flash de thème */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`
          ${geist.variable}
          ${geistMono.variable}
          ${playfair.variable}
          font-sans
          bg-paper dark:bg-paper-dark
          text-ink dark:text-ink-dark
          antialiased
        `}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}