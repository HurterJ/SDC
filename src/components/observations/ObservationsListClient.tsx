'use client'

import { useState } from 'react'
import { Observation, ObservationStatus, ObservationPriority } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, STATUS_DOT_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils/status'
import ObservationPanel from './ObservationPanel'
import ExportModal from '@/components/export/ExportModal'
import { Search, Download, AlertCircle, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  observations: Observation[]
  userId: string
  role: string
  projectId: string
  projectName?: string
}

const ALL_STATUSES: ObservationStatus[] = ['ouverte', 'en_cours', 'resolue', 'contestee', 'validee']
const ALL_PRIORITIES: ObservationPriority[] = ['critique', 'haute', 'normale', 'basse']

type SortKey = 'date_desc' | 'date_asc' | 'priority' | 'status'

const SORT_LABELS: Record<SortKey, string> = {
  date_desc: 'Plus récent',
  date_asc: 'Plus ancien',
  priority: 'Priorité',
  status: 'Statut',
}

const PRIORITY_ORDER: Record<ObservationPriority, number> = { critique: 0, haute: 1, normale: 2, basse: 3 }
const STATUS_ORDER: Record<ObservationStatus, number> = { ouverte: 0, contestee: 1, en_cours: 2, resolue: 3, validee: 4 }

export default function ObservationsListClient({ observations: initial, userId, role, projectId, projectName = '' }: Props) {
  const [observations, setObservations] = useState(initial)
  const [selected, setSelected] = useState<Observation | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ObservationStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<ObservationPriority | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [showExport, setShowExport] = useState(false)

  // Categories uniques
  const categories = [...new Set(observations.map((o) => o.category).filter(Boolean))] as string[]

  const filtered = observations
    .filter((o) => {
      const matchSearch =
        !search ||
        o.title.toLowerCase().includes(search.toLowerCase()) ||
        o.description?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === 'all' || o.status === filterStatus
      const matchPriority = filterPriority === 'all' || o.priority === filterPriority
      const matchCategory = filterCategory === 'all' || o.category === filterCategory
      return matchSearch && matchStatus && matchPriority && matchCategory
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'priority':
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        default: // date_desc
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // Compteurs rapides
  const openCount = observations.filter((o) => o.status === 'ouverte' || o.status === 'en_cours').length
  const resolvedCount = observations.filter((o) => o.status === 'resolue' || o.status === 'validee').length

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
        {/* Compteurs rapides */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-xl p-3 text-center border transition-all ${filterStatus === 'all' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <p className="text-xl font-bold text-slate-900">{observations.length}</p>
            <p className="text-xs text-slate-500">Total</p>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'ouverte' ? 'all' : 'ouverte')}
            className="rounded-xl p-3 text-center border border-red-100 bg-red-50 hover:border-red-200 transition-all"
          >
            <p className="text-xl font-bold text-red-700">{openCount}</p>
            <p className="text-xs text-red-600">En cours</p>
          </button>
          <button
            onClick={() => setFilterStatus(filterStatus === 'resolue' ? 'all' : 'resolue')}
            className="rounded-xl p-3 text-center border border-green-100 bg-green-50 hover:border-green-200 transition-all"
          >
            <p className="text-xl font-bold text-green-700">{resolvedCount}</p>
            <p className="text-xs text-green-600">Résolues</p>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-40">
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
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as ObservationPriority | 'all')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes priorités</option>
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>

          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>

          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        {/* Count */}
        <p className="text-sm text-slate-500 mb-3">
          {filtered.length} réserve{filtered.length !== 1 ? 's' : ''}
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
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT_COLORS[obs.status]}`} />
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

      {/* Export modal */}
      {showExport && (
        <ExportModal
          projectId={projectId}
          projectName={projectName}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
