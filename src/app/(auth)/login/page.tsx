'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, Mail, Lock, Loader2 } from 'lucide-react'

// Messages Supabase Auth les plus courants, traduits pour l'utilisateur
function loginErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return "Votre adresse email n'est pas encore confirmée."
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
  }
  return 'Connexion impossible. Vérifiez vos identifiants puis réessayez.'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim()
    if (!cleanEmail || !password) {
      setError('Renseignez votre email et votre mot de passe.')
      return
    }

    setLoading(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email: cleanEmail, password })
    if (error) {
      setError(loginErrorMessage(error.message))
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-white">SiteSuivi</h1>
          <p className="text-slate-300 mt-1">Gestion des réserves de chantier</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Connexion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="vous@exemple.ch"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={128}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm p-3 rounded-lg bg-red-50 text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Se connecter
            </button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Pas encore de compte ? L&apos;accès se fait sur invitation : contactez l&apos;administrateur de SiteSuivi.
          </p>
        </div>
      </main>

      <footer className="mt-8 text-center text-sm text-slate-300">
        <Link href="/confidentialite" className="hover:text-white underline-offset-4 hover:underline">
          Confidentialité
        </Link>
        <span className="mx-2" aria-hidden="true">·</span>
        <Link href="/conditions" className="hover:text-white underline-offset-4 hover:underline">
          Conditions d&apos;utilisation
        </Link>
      </footer>
    </div>
  )
}
