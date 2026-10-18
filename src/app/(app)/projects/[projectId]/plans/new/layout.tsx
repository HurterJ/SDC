import type { Metadata } from 'next'

// La page est un composant client : son titre est défini ici
export const metadata: Metadata = { title: 'Nouveau plan' }

export default function NewPlanLayout({ children }: { children: React.ReactNode }) {
  return children
}
