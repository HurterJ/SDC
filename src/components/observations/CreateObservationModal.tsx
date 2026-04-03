'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Observation, ObservationPriority } from '@/types'
import { X, Loader2 } from 'lucide-react'

interface Props {
  projectId: string
  planId: string
  pinX: number
  pinY: number
  userId: string
  onClose: () => void
  onCreated: (obs: Observation) => void
}

const PRIORITIES: { value: ObservationPriority; label: string }[] = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'critique', label: 'Critique' },
]

const CATEGORIES = [
  'Gros œuvre', 'Second œuvre', 'Électricité', 'Plomberie',
  'CVC', 'Menuiseries', 'Revêtements', 'Peinture', 'Autre',
]

export default function CreateObservationModal({
  projectId, planId, pinX, pinY, userId, onClose, onCreated,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ObservationPriority>('normale')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('observations')
      .insert({
        project_id: projectId,
        plan_id: planId,
        plan_x: pinX,
        plan_y: pinY,
        title,
        description: description || null,
        priority,
        category: category || null,
        due_date: dueDate || null,
        created_by: userId,
        status: 'ouverte',
      })
      .select()
      .single()

    if (!error && data) {
      onCreated(data as Observation)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Nouvelle observation</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="Ex: Fissure sur le mur porteur..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
              placeholder="Description détaillée de l'observation..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ObservationPriority)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              >
                <option value="">— Sélectionner —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date d'échéance</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
            Position sur le plan : x={pinX.toFixed(1)}%, y={pinY.toFixed(1)}%
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Annuler
          </button>
          <button
            form=""
            onClick={(e) => {
              const form = (e.currentTarget.closest('.fixed') as HTMLElement)?.querySelector('form')
              form?.requestSubmit()
            }}
            disabled={loading || !title.trim()}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer l'observation
          </button>
        </div>
      </div>
    </div>
  )
}
