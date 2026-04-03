'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Observation, ObservationStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils/status'
import PhotoUpload from './PhotoUpload'
import { X, Trash2, Calendar, Tag, Loader2, MessageSquare, Send } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  observation: Observation
  userId: string
  role: string
  onClose: () => void
  onUpdated: (obs: Observation) => void
  onDeleted: (id: string) => void
}

const STATUSES: ObservationStatus[] = ['ouverte', 'en_cours', 'resolue', 'contestee', 'validee']

export default function ObservationPanel({ observation, userId, role, onClose, onUpdated, onDeleted }: Props) {
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comment, setComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [comments, setComments] = useState<Array<{ id: string; content: string; created_at: string; author_id: string | null }>>([])
  const supabase = createClient()

  const canEdit = role === 'conducteur'
  const canResolve = role === 'conducteur' || role === 'installateur'

  async function updateStatus(status: ObservationStatus) {
    setUpdating(true)
    const update: Partial<Observation> = { status }
    if (status === 'resolue') update.resolved_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('observations')
      .update(update)
      .eq('id', observation.id)
      .select()
      .single()
    if (!error && data) onUpdated(data as Observation)
    setUpdating(false)
  }

  async function deleteObservation() {
    if (!confirm('Supprimer cette observation définitivement ?')) return
    setDeleting(true)
    await supabase.from('observations').delete().eq('id', observation.id)
    onDeleted(observation.id)
    setDeleting(false)
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setSendingComment(true)
    const { data } = await supabase
      .from('observation_comments')
      .insert({ observation_id: observation.id, author_id: userId, content: comment })
      .select()
      .single()
    if (data) {
      setComments([...comments, data])
      setComment('')
    }
    setSendingComment(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-100">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-slate-800 leading-snug">{observation.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {format(new Date(observation.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg flex-shrink-0">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status & Priority */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[observation.status]}`}>
              {STATUS_LABELS[observation.status]}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[observation.priority]}`}>
              {PRIORITY_LABELS[observation.priority]}
            </span>
            {observation.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-100 text-slate-600">
                <Tag className="w-3 h-3" />
                {observation.category}
              </span>
            )}
          </div>

          {observation.due_date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              Échéance : {format(new Date(observation.due_date), 'dd MMMM yyyy', { locale: fr })}
            </div>
          )}
        </div>

        {/* Description */}
        {observation.description && (
          <div className="p-4 border-b border-slate-100">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Description</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{observation.description}</p>
          </div>
        )}

        {/* Status actions */}
        {(canEdit || canResolve) && (
          <div className="p-4 border-b border-slate-100">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Changer le statut</h4>
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => {
                if (!canEdit && s === 'validee') return false
                if (!canEdit && s === 'contestee') return true
                return true
              }).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={updating || observation.status === s}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    observation.status === s
                      ? STATUS_COLORS[s] + ' cursor-default'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        <div className="p-4 border-b border-slate-100">
          <PhotoUpload
            observationId={observation.id}
            userId={userId}
            canUpload={canEdit || role === 'installateur'}
          />
        </div>

        {/* Comments */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Commentaires
          </h4>

          {!comments.length && (
            <p className="text-sm text-slate-400 text-center py-4">Aucun commentaire</p>
          )}

          <div className="space-y-3 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-700">{c.content}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={sendComment} className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
            <button
              type="submit"
              disabled={sendingComment || !comment.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={deleteObservation}
            disabled={deleting}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer l'observation
          </button>
        </div>
      )}
    </div>
  )
}
