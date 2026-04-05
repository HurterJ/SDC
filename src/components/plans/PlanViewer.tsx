'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Document, Page, pdfjs } from 'react-pdf'
import { Observation } from '@/types'
import { PIN_COLORS, STATUS_LABELS } from '@/lib/utils/status'
import { ZoomIn, ZoomOut, Maximize2, Loader2 } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Props {
  planUrl: string
  observations: Observation[]
  canAddPin: boolean
  onPinClick: (observation: Observation) => void
  onMapClick?: (x: number, y: number) => void
}

export default function PlanViewer({ planUrl, observations, canAddPin, onPinClick, onMapClick }: Props) {
  const [pdfWidth, setPdfWidth] = useState(900)
  const [currentScale, setCurrentScale] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isPdf = /\.pdf($|\?)/i.test(planUrl)

  // ResizeObserver : recalcule la largeur PDF quand le conteneur change de taille
  useEffect(() => {
    if (!isPdf || !wrapperRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setPdfWidth(Math.min(w - 32, 1400))
    })
    observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [isPdf])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!canAddPin || !onMapClick) return
      e.preventDefault()
      const rect = contentRef.current?.getBoundingClientRect()
      if (!rect) return
      onMapClick(
        ((e.clientX - rect.left) / rect.width) * 100,
        ((e.clientY - rect.top) / rect.height) * 100
      )
    },
    [canAddPin, onMapClick]
  )

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-slate-800 rounded-xl overflow-hidden">
      <TransformWrapper
        initialScale={1} minScale={0.2} maxScale={6}
        doubleClick={{ disabled: true }}
        onTransformed={(_, s) => setCurrentScale(s.scale)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Contrôles zoom */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              {([
                { fn: zoomIn, Icon: ZoomIn, title: 'Zoom +' },
                { fn: zoomOut, Icon: ZoomOut, title: 'Zoom -' },
                { fn: resetTransform, Icon: Maximize2, title: 'Réinitialiser' },
              ] as const).map(({ fn, Icon, title }) => (
                <button key={title} onClick={() => fn()} title={title}
                  className="w-9 h-9 bg-white rounded-lg shadow flex items-center justify-center hover:bg-slate-50 transition-colors">
                  <Icon className="w-4 h-4 text-slate-700" />
                </button>
              ))}
            </div>

            {/* Indicateur zoom */}
            <div className="absolute top-4 right-16 z-20 bg-white/80 backdrop-blur rounded-lg px-2 py-1 text-xs text-slate-600 font-mono">
              {Math.round(currentScale * 100)}%
            </div>

            {/* Hint double-clic */}
            {canAddPin && (
              <div className="absolute bottom-16 right-4 z-20 bg-black/50 text-white text-xs rounded-lg px-2 py-1 pointer-events-none">
                Double-clic pour ajouter
              </div>
            )}

            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <div
                ref={contentRef}
                className={`relative w-full h-full flex items-center justify-center ${canAddPin ? 'cursor-crosshair' : ''}`}
                onDoubleClick={handleDoubleClick}
              >
                {isPdf ? (
                  <Document
                    file={planUrl}
                    loading={
                      <div className="flex flex-col items-center gap-3 text-white">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                        <p className="text-sm">Chargement du plan PDF...</p>
                      </div>
                    }
                    error={
                      <div className="text-red-300 text-sm text-center p-8">
                        Impossible de charger le PDF.<br />Vérifiez que le bucket Supabase est public.
                      </div>
                    }
                  >
                    <Page
                      pageNumber={1}
                      width={pdfWidth}
                      devicePixelRatio={Math.min(window.devicePixelRatio * 4, 8)}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      className="shadow-2xl"
                    />
                  </Document>
                ) : (
                  <img src={planUrl} alt="Plan"
                    className="max-w-full max-h-full object-contain select-none shadow-2xl"
                    draggable={false} />
                )}

                {/* Pins — taille visuelle constante via scale(1/zoom) */}
                {observations.map((obs) => {
                  if (obs.plan_x == null || obs.plan_y == null) return null
                  return (
                    <PinMarker key={obs.id} observation={obs} scale={currentScale}
                      onClick={() => onPinClick(obs)} />
                  )
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* Légende statuts */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur rounded-lg shadow px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(PIN_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
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

const BASE_SIZE = 28

function PinMarker({ observation, scale, onClick }: {
  observation: Observation; scale: number; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="absolute z-10 cursor-pointer"
      style={{
        left: `${observation.plan_x}%`,
        top: `${observation.plan_y}%`,
        width: BASE_SIZE, height: BASE_SIZE,
        transform: `translate(-50%, -50%) scale(${1 / scale})`,
        transformOrigin: 'center center',
      }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="w-full h-full rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold hover:scale-125 transition-transform text-xs"
        style={{ backgroundColor: PIN_COLORS[observation.status] }}
      >
        !
      </div>

      {hovered && (
        <div className="absolute left-1/2 bottom-full mb-2 w-48 bg-slate-900 text-white rounded-lg shadow-xl p-2 text-xs pointer-events-none"
          style={{ transform: 'translateX(-50%)', transformOrigin: 'bottom center' }}>
          <p className="font-semibold truncate">{observation.title}</p>
          <p className="text-slate-300 mt-0.5">{STATUS_LABELS[observation.status]}</p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{ borderTop: '4px solid #0f172a', borderLeft: '4px solid transparent', borderRight: '4px solid transparent' }} />
        </div>
      )}
    </div>
  )
}
