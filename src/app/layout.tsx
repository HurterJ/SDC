import type { Metadata, Viewport } from 'next'
import './globals.css'
import PWARegistration from '@/components/PWARegistration'

export const metadata: Metadata = {
  title: 'SiteSuivi — Gestion des réserves de chantier',
  description: 'Plateforme de suivi des réserves et observations de chantier',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SiteSuivi',
  },
  icons: {
    apple: '/api/icon?size=180',
    icon: [
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
