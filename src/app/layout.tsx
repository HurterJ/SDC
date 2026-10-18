import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegistration from '@/components/PWARegistration'

export const metadata: Metadata = {
  title: {
    default: 'SiteSuivi — Gestion des réserves de chantier',
    template: '%s · SiteSuivi',
  },
  description: 'Plateforme de suivi des réserves et observations de chantier',
  // Outil privé : ni indexation ni suivi des liens (voir aussi robots.txt et X-Robots-Tag)
  robots: { index: false, follow: false },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SiteSuivi',
  },
  icons: {
    apple: '/api/icon?size=180',
    // favicon.ico (16/32/48 px) est ajouté automatiquement depuis src/app ; icon.svg reste net à toute taille
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/api/icon?size=192', sizes: '192x192', type: 'image/png' },
      { url: '/api/icon?size=512', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1e3a5f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <PWARegistration />
        {children}
      </body>
    </html>
  )
}
