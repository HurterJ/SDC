import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Page introuvable' }

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-6">
          <Building2 className="w-7 h-7 text-white" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-blue-700">Erreur 404</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Page introuvable</h1>
        <p className="mt-3 text-slate-600">
          Cette page n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <p className="mt-3 text-slate-600">
          Vous avez ouvert un lien installateur ? Il a peut-être été désactivé ou mal copié :
          demandez un nouveau lien au conducteur de travaux.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  )
}
