'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plan, Observation } from '@/types'
import ObservationPanel from '@/components/observations/ObservationPanel'
import CreateObservationModal from '@/components/observations/CreateObservationModal'
import { ArrowLeft, Map, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react'
import Link from 'next/link'

const PlanViewer = dynamic(() => import('@/components/plans/PlanViewer'), { ssr: false })

interface PlanItem {
  id: string
  name: string
}

interface Props {
  plan: Plan
  plans: PlanItem[]
  projectName: string
  observations: Observation[]
  userId: string
  role: string
  projectId: string
}

export default function PlanPageClient({
  plan, plans, projectName, observations: initial, userId, role, projectId,
}: Props) {
  const [observations, setObservations] = useState(initial)
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null)
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const canEdit = role === 'conducteur' || role === 'installateur'

  function handleMapClick(x: number, y: number) {
    if (!canEdit) return
    setPendingPin({ x, y })
  }

  async function handleObservationCreated(obs: Observation) {
    setObservations([obs, ...observations])
    setPendingPin(null)
  }

  async function handleObservationUpdated(updated: Observation) {
    setObservations(observations.map((o) => (o.id === updated.id ? updated : o)))
    setSelectedObs(updated)
  }

  async function handleObservationDeleted(id: string) {
    setObservations(observations.filter((o) => o.id !== id))
    setSelectedObs(null)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <Link
          href={`/projects/${projectId}`}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 truncate">{projectName}</p>
          <h1 className="font-semibold text-slate-800 truncate">{plan.name}</h1>
        </div>
        <p className="text-xs text-slate-400 flex-shrink-0">
          {observations.length} obs.
        </p>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg"
          title="Plans"
        >
          <LayoutList className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar arborescence gauche */}
        <aside
          className={`
            flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col transition-all duration-200
            ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}
            hidden md:flex
          `}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <Map className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide truncate">Plans</span>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-100 rounded flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <Link
            href={`/projects/${projectId}`}
            className="px-3 py-2 text-xs text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors truncate"
          >
            ← {projectName}
          </Link>

          <nav className="flex-1">
            {plans.map((p) => {
              const isCurrent = p.id === plan.id
              return (
                <Link
                  key={p.id}
                  href={`/projects/${projectId}/plans/${p.id}`}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Map className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{p.name}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex flex-shrink-0 w-6 items-center justify-center bg-white border-r border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>
        )}

        {/* Plan viewer */}
        <div className="flex-1 p-4 overflow-hidden">
          <PlanViewer
            planUrl={plan.file_url}
            observations={observations}
            canAddPin={canEdit}
            onPinClick={(obs) => setSelectedObs(obs)}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Side panel observation */}
        {selectedObs && (
          <div className="w-80 xl:w-96 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
            <ObservationPanel
              observation={selectedObs}
              userId={userId}
              role={role}
              onClose={() => setSelectedObs(null)}
              onUpdated={handleObservationUpdated}
              onDeleted={handleObservationDeleted}
            />
          </div>
        )}
      </div>

      {/* Modal de création */}
      {pendingPin && (
        <CreateObservationModal
          projectId={projectId}
          planId={plan.id}
          pinX={pendingPin.x}
          pinY={pendingPin.y}
          userId={userId}
          onClose={() => setPendingPin(null)}
          onCreated={handleObservationCreated}
        />
      )}
    </div>
  )
}
