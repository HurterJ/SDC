import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SiteSuivi — Gestion des réserves de chantier',
  description: 'Plateforme de suivi des réserves et observations de chantier',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  )
}
