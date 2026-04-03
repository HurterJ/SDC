'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { InstallerToken } from '@/types'
import { Link2, Plus, X, Copy, Check, Loader2, Power, PowerOff } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  tokens: InstallerToken[]
  userId: string
  projectId: string
  project?: { id: string; name: string }
}

export default function MembersClient({ tokens: initial, userId, projectId }: Props) {
  const [tokens, setTokens] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'installateur' | 'lecteur'>('installateur')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const supabase = createClient()

  async function createToken(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('installer_tokens')
      .insert({
        project_id: projectId,
        name,
        company: company || null,
        email: email || null,
        role,
        expires_at: expiresAt || null,
        created_by: userId,
      })
      .select()
      .single()

    if (!error && data) {
      setTokens([data, ...tokens])
      setShowModal(false)
      setName('')
      setCompany('')
      setEmail('')
      setExpiresAt('')
    }
    setLoading(false)
  }

  async function toggleToken(id: string, isActive: boolean) {
    await supabase.from('installer_tokens').update({ is_active: !isActive }).eq('id', id)
    setTokens(tokens.map((t) => (t.id === id ? { ...t, is_active: !isActive } : t)))
  }

  async function deleteToken(id: string) {
    if (!confirm('Supprimer ce lien d\'accès ?')) return
    await supabase.from('installer_tokens').delete().eq('id', id)
    setTokens(tokens.filter((t) => t.id !== id))
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/installer/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Liens d'accès installateurs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Partagez des liens uniques pour permettre aux intervenants d'accéder aux réserves sans compte
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Créer un lien
        </button>
      </div>

      {!tokens.length ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Link2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aucun lien d'accès créé</p>
          <p className="text-slate-400 text-sm mt-1">Les liens permettent aux installateurs d'accéder sans compte</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => {
            const url = typeof window !== 'undefined'
              ? `${window.location.origin}/installer/${token.token}`
              : `/installer/${token.token}`
            const isExpired = token.expires_at && new Date(token.expires_at) < new Date()

            return (
              <div
                key={token.id}
                className={`bg-white border rounded-xl p-4 ${!token.is_active || isExpired ? 'opacity-60' : ''} ${
                  isExpired ? 'border-red-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{token.name}</p>
                      {token.company && (
                        <span className="text-xs text-slate-500">— {token.company}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        token.role === 'installateur'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {token.role === 'installateur' ? 'Installateur' : 'Lecteur'}
                      </span>
                      {!token.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Désactivé</span>
                      )}
                      {isExpired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Expiré</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded truncate max-w-xs">
                        {url}
                      </code>
                      <button
                        onClick={() => copyLink(token.token)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                        title="Copier le lien"
                      >
                        {copied === token.token ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Créé le {format(new Date(token.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                      {token.expires_at && (
                        <span className={isExpired ? 'text-red-500' : ''}>
                          Expire le {format(new Date(token.expires_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleToken(token.id, token.is_active)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        token.is_active
                          ? 'text-orange-500 hover:bg-orange-50'
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                      title={token.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {token.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteToken(token.id)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create token modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Créer un lien d'accès</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={createToken} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    placeholder="SARL BTP..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'installateur' | 'lecteur')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  >
                    <option value="installateur">Installateur</option>
                    <option value="lecteur">Lecteur</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date d'expiration</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer le lien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
