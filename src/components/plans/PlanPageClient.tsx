'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plan, Observation } from '@/types'
import ObservationPanel from '@/components/observations/ObservationPanel'
import CreateObservationModal from '@/components/observations/CreateObservationModal'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PlanViewer = dynamic(() => import('@/components/plans/PlanViewer'), { ssr: false })

interface Props {
  plan: Plan
  observations: Observation[]
  userId: string
  role: string
  projectId: string
}

export default function PlanPageClient({ plan, observations: initial, userId, role, projectId }: Props) {
  const [observations, setObservations] = useState(initial)
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null)
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)

  const canEdit = role === 'conducteur' || role === 'installateur'

  function handlePinClick(obs: Observation) {
    setSelectedObs(obs)
  }

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
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <Link
          href={`/projects/${projectId}`}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="font-semibold text-slate-800">{plan.name}</h1>
          <p className="text-xs text-slate-400">{observations.length} observation{observations.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Plan viewer */}
        <div className="flex-1 p-4 overflow-hidden">
          <PlanViewer
            planUrl={plan.file_url}
            observations={observations}
            canAddPin={canEdit}
            onPinClick={handlePinClick}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Side panel */}
        {selectedObs && (
          <div className="w-96 border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0">
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

      {/* Create observation modal */}
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
