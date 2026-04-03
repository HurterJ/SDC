'use client'

import { useState } from 'react'
import { Observation, ObservationStatus } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils/status'
import ObservationPanel from './ObservationPanel'
import { Search, Download, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

interface Props {
  observations: Observation[]
  userId: string
  role: string
  projectId: string
}

const ALL_STATUSES: ObservationStatus[] = ['ouverte', 'en_cours', 'resolue', 'contestee', 'validee']

export default function ObservationsListClient({ observations: initial, userId, role, projectId }: Props) {
  const [observations, setObservations] = useState(initial)
  const [selected, setSelected] = useState<Observation | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ObservationStatus | 'all'>('all')

  const filtered = observations.filter((o) => {
    const matchSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.description?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    return matchSearch && matchStatus
  })

  function handleUpdated(updated: Observation) {
    setObservations(observations.map((o) => (o.id === updated.id ? updated : o)))
    setSelected(updated)
  }

  function handleDeleted(id: string) {
    setObservations(observations.filter((o) => o.id !== id))
    setSelected(null)
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ObservationStatus | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 bg-white"
          >
            <option value="all">Tous les statuts</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <Link
            href={`/api/export?projectId=${projectId}&format=excel`}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel
          </Link>

          <Link
            href={`/api/export?projectId=${projectId}&format=pdf`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            PDF
          </Link>
        </div>

        {/* Count */}
        <p className="text-sm text-slate-500 mb-3">
          {filtered.length} observation{filtered.length !== 1 ? 's' : ''}
          {filterStatus !== 'all' && ` (${STATUS_LABELS[filterStatus]})`}
        </p>

        {/* List */}
        {!filtered.length ? (
          <div className="flex flex-col items-center py-16 text-center bg-white rounded-xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Aucune observation trouvée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((obs) => (
              <button
                key={obs.id}
                onClick={() => setSelected(obs)}
                className={`w-full text-left bg-white border rounded-xl p-4 hover:shadow-md transition-all ${
                  selected?.id === obs.id ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT_COLORS[obs.status]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 truncate">{obs.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[obs.priority]}`}>
                        {PRIORITY_LABELS[obs.priority]}
                      </span>
                    </div>
                    {obs.description && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{obs.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[obs.status]}`}>
                        {STATUS_LABELS[obs.status]}
                      </span>
                      {obs.category && (
                        <span className="text-xs text-slate-400">{obs.category}</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {format(new Date(obs.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                      {obs.due_date && (
                        <span className="text-xs text-orange-500">
                          Échéance : {format(new Date(obs.due_date), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-96 bg-white border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 sticky top-0 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
          <ObservationPanel
            observation={selected}
            userId={userId}
            role={role}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        </div>
      )}
    </div>
  )
}
