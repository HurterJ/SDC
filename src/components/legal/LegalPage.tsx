import Link from 'next/link'
import { Building2 } from 'lucide-react'

interface Props {
  title: string
  updatedAt: string
  children: React.ReactNode
}

// Mise en page commune aux pages légales, publiques (accessibles sans connexion)
export default function LegalPage({ title, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-800 font-semibold">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <Building2 className="w-4 h-4 text-white" aria-hidden="true" />
            </span>
            SiteSuivi
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">Dernière mise à jour : {updatedAt}</p>
        <div className="mt-8 space-y-8 text-slate-700 leading-relaxed">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <nav
          aria-label="Informations légales"
          className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600"
        >
          <Link href="/confidentialite" className="hover:text-slate-900 hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/conditions" className="hover:text-slate-900 hover:underline">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/login" className="hover:text-slate-900 hover:underline">
            Connexion
          </Link>
        </nav>
      </footer>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-6 space-y-1.5">{children}</ul>
}

// Information que l'exploitant doit renseigner avant la mise en ligne
export function ToComplete({ children }: { children: React.ReactNode }) {
  return <mark className="bg-amber-100 text-amber-900 px-1 rounded-sm">[À compléter : {children}]</mark>
}
