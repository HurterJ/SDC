import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connexion à SiteSuivi, le suivi des réserves et observations de chantier.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
