'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Observation, ObservationStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, PRIORITY_LABELS } from '@/lib/utils/status'
import { Building2, CheckCircle, AlertTriangle, MessageSquare, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  token: {
    id: string
    name: string
    company: string | null
    role: string
    project_id: string
    projects: { name: string; description: string | null } | null
  }
  observations: Observation[]
}

export default function InstallerView({ token, observations: initial }: Props) {
  const [observations, setObservations] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)
  const supabase = createClient()

  const canEdit = token.role === 'installateur'

  async function updateStatus(obsId: string, status: ObservationStatus) {
    const { data } = await supabase
      .from('observations')
      .update({ status })
      .eq('id', obsId)
      .select()
      .single()
    if (data) {
      setObservations(observations.map((o) => (o.id === obsId ? data as Observation : o)))
    }
  }

  async function sendComment(obsId: string) {
    const content = comments[obsId]?.trim()
    if (!content) return
    setSending(obsId)
    await supabase.from('observation_comments').insert({
      observation_id: obsId,
      installer_token_id: token.id,
      installer_name: token.name,
      content,
    })
    setComments({ ...comments, [obsId]: '' })
    setSending(null)
  }

  const openCount = observations.filter((o) => o.status === 'ouverte').length
  const resolvedCount = observations.filter((o) => o.status === 'resolue' || o.status === 'validee').length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SiteSuivi</h1>
              <p className="text-slate-400 text-sm">Accès installateur</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold">{token.projects?.name}</h2>
          <p className="text-slate-400 text-sm mt-1">
            Connecté en tant que <span className="text-white font-medium">{token.name}</span>
            {token.company && ` — ${token.company}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{observations.length}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-700">{openCount}</p>
            <p className="text-xs text-red-600">Ouvertes</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{resolvedCount}</p>
            <p className="text-xs text-green-600">Résolues</p>
          </div>
        </div>

        {/* Observations */}
        <div className="space-y-3">
          {observations.map((obs) => (
            <div key={obs.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === obs.id ? null : obs.id)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT_COLORS[obs.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{obs.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[obs.status]}`}>
                      {STATUS_LABELS[obs.status]}
                    </span>
                    <span className="text-xs text-slate-400">{PRIORITY_LABELS[obs.priority]}</span>
                  </div>
                </div>
                {expanded === obs.id ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {expanded === obs.id && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                  {obs.description && (
                    <p className="text-sm text-slate-600">{obs.description}</p>
                  )}

                  {obs.due_date && (
                    <p className="text-xs text-orange-500">
                      Échéance : {format(new Date(obs.due_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}

                  {/* Photos */}
                  {obs.photos && obs.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {obs.photos.map((p) => (
                        <img
                          key={p.id}
                          src={p.file_url}
                          alt="Photo"
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions pour installateur */}
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(obs.id, 'resolue')}
                        disabled={obs.status === 'resolue' || obs.status === 'validee'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marquer résolue
                      </button>
                      <button
                        onClick={() => updateStatus(obs.id, 'contestee')}
                        disabled={obs.status === 'contestee'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Contester
                      </button>
                    </div>
                  )}

                  {/* Comment */}
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Ajouter un commentaire
                    </h4>
                    <div className="flex gap-2">
                      <input
                        value={comments[obs.id] ?? ''}
                        onChange={(e) => setComments({ ...comments, [obs.id]: e.target.value })}
                        placeholder="Votre commentaire..."
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                      <button
                        onClick={() => sendComment(obs.id)}
                        disabled={sending === obs.id || !comments[obs.id]?.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {sending === obs.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!observations.length && (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p className="font-medium">Aucune observation en cours</p>
          </div>
        )}
      </div>
    </div>
  )
}
