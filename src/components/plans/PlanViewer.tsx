'use client'

import { useState, useRef, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Observation } from '@/types'
import { PIN_COLORS, STATUS_LABELS } from '@/lib/utils/status'
import { ZoomIn, ZoomOut, Maximize2, Plus } from 'lucide-react'

interface Props {
  planUrl: string
  observations: Observation[]
  canAddPin: boolean
  onPinClick: (observation: Observation) => void
  onMapClick?: (x: number, y: number) => void
}

export default function PlanViewer({
  planUrl,
  observations,
  canAddPin,
  onPinClick,
  onMapClick,
}: Props) {
  const [addingPin, setAddingPin] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!addingPin || !onMapClick) return
      const rect = imageRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      onMapClick(x, y)
      setAddingPin(false)
    },
    [addingPin, onMapClick]
  )

  return (
    <div className="relative w-full h-full bg-slate-800 rounded-xl overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={5}
        disabled={addingPin}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controls */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button
                onClick={() => zoomIn()}
                className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Zoom +"
              >
                <ZoomIn className="w-4 h-4 text-slate-700" />
              </button>
              <button
                onClick={() => zoomOut()}
                className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Zoom -"
              >
                <ZoomOut className="w-4 h-4 text-slate-700" />
              </button>
              <button
                onClick={() => resetTransform()}
                className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Réinitialiser"
              >
                <Maximize2 className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {/* Add pin button */}
            {canAddPin && (
              <button
                onClick={() => setAddingPin(!addingPin)}
                className={`absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-lg shadow text-sm font-medium transition-all ${
                  addingPin
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-4 h-4" />
                {addingPin ? 'Cliquez sur le plan...' : 'Placer une observation'}
              </button>
            )}

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <div
                className={`relative w-full h-full flex items-center justify-center ${addingPin ? 'cursor-crosshair' : ''}`}
                onClick={handleImageClick}
              >
                {/* Plan image */}
                <img
                  ref={imageRef}
                  src={planUrl}
                  alt="Plan"
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                />

                {/* Pins */}
                {observations.map((obs) => {
                  if (obs.plan_x == null || obs.plan_y == null) return null
                  return (
                    <PinMarker
                      key={obs.id}
                      observation={obs}
                      onClick={() => onPinClick(obs)}
                    />
                  )
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Status legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur rounded-lg shadow px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(PIN_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-slate-600">
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PinMarker({
  observation,
  onClick,
}: {
  observation: Observation
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const color = PIN_COLORS[observation.status]

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
      style={{
        left: `${observation.plan_x}%`,
        top: `${observation.plan_y}%`,
      }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pin circle */}
      <div
        className="w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-125"
        style={{ backgroundColor: color }}
      >
        !
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-900 text-white rounded-lg shadow-xl p-2 text-xs pointer-events-none">
          <p className="font-semibold truncate">{observation.title}</p>
          <p className="text-slate-300 mt-0.5">{STATUS_LABELS[observation.status]}</p>
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{ borderTop: `4px solid #0f172a`, borderLeft: '4px solid transparent', borderRight: '4px solid transparent' }}
          />
        </div>
      )}
    </div>
  )
}
