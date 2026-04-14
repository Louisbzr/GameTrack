import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider, themeScript } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Backlogg',
  description: 'Suivez et découvrez vos jeux vidéo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}