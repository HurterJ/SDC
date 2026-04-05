'use client'

import { useState } from 'react'
import { ObservationStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/utils/status'
import { X, FileDown, Loader2, FileSpreadsheet } from 'lucide-react'

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
}

const ALL_STATUSES: ObservationStatus[] = ['ouverte', 'en_cours', 'resolue', 'contestee', 'validee']

export default function ExportModal({ projectId, projectName, onClose }: Props) {
  const [title, setTitle] = useState(`Rapport de Réserves — ${projectName}`)
  const [subtitle, setSubtitle] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ObservationStatus>>(new Set(ALL_STATUSES))
  const [showPhotos, setShowPhotos] = useState(true)
  const [colorMode, setColorMode] = useState(true)
  const [generating, setGenerating] = useState(false)

  function toggleStatus(s: ObservationStatus) {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  }

  function buildUrl(format: 'pdf' | 'excel') {
    const params = new URLSearchParams({
      projectId,
      format,
      title,
      subtitle,
      filterStatus: [...selectedStatuses].join(','),
      showPhotos: showPhotos ? '1' : '0',
      colorMode: colorMode ? '1' : '0',
    })
    return `/api/export?${params.toString()}`
  }

  async function handlePdf() {
    setGenerating(true)
    window.open(buildUrl('pdf'), '_blank')
    setTimeout(() => setGenerating(false), 1000)
  }

  function handleExcel() {
    window.location.href = buildUrl('excel')
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Exporter les réserves</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre du rapport</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Sous-titre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sous-titre <span className="text-slate-400 font-normal">(optionnel)</span>
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: Contrôle du 05/04/2026 — Lot électricité"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Statuts */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Inclure les statuts</label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedStatuses.has(s)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Options</label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setShowPhotos(!showPhotos)}
                className={`w-10 h-6 rounded-full transition-colors ${showPhotos ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${showPhotos ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-slate-700">Inclure les photos</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setColorMode(!colorMode)}
                className={`w-10 h-6 rounded-full transition-colors ${colorMode ? 'bg-blue-600' : 'bg-slate-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-1 transition-transform ${colorMode ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-slate-700">Affichage en couleurs</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={handleExcel}
            className="flex items-center justify-center gap-2 flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            Excel
          </button>
          <button
            onClick={handlePdf}
            disabled={generating || selectedStatuses.size === 0}
            className="flex items-center justify-center gap-2 flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Générer PDF
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center pb-4 px-6">
          Le PDF s'ouvre dans un nouvel onglet → Fichier → Imprimer → Enregistrer en PDF
        </p>
      </div>
    </div>
  )
}
