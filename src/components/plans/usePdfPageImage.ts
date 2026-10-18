'use client'

import { useEffect, useState } from 'react'

// Plus grand côté de l'image rendue : assez pour zoomer sur un plan (zoom ×6),
// et sous la limite de taille des canvas de Safari iOS (16,7 Mpx).
const MAX_SIDE = 4096

type State = { status: 'idle' | 'loading' | 'ready' | 'error'; src: string | null }

/**
 * Rend la première page d'un PDF en image PNG (URL blob), dans le navigateur, avec pdf.js.
 * Le visualiseur affiche ensuite cette image comme un plan image : zoom, pins et double-clic.
 * Build « legacy » de pdf.js : compatible avec les iPhone et tablettes un peu anciens du chantier.
 */
export function usePdfPageImage(url: string | null): State {
  const [state, setState] = useState<State>({ status: url ? 'loading' : 'idle', src: null })

  useEffect(() => {
    if (!url) {
      setState({ status: 'idle', src: null })
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    // Un worker par rendu : un worker partagé serait fermé par le premier rendu terminé
    // (React relance l'effet en développement, et à chaque changement de plan).
    let port: Worker | null = null
    let destroy: (() => void) | null = null
    setState({ status: 'loading', src: null })

    ;(async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      if (cancelled) return

      // Worker classique (pas { type: 'module' }) : webpack charge ses morceaux avec importScripts
      port = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url))
      // Le typage JSDoc de pdf.js déclare `port` en `null` : il accepte pourtant un Worker
      const worker = new pdfjs.PDFWorker({ port: port as never })
      const task = pdfjs.getDocument({ url, worker })
      destroy = () => {
        task.destroy()
        worker.destroy()
        port?.terminate()
      }

      const doc = await task.promise
      const page = await doc.getPage(1)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: MAX_SIDE / Math.max(base.width, base.height) })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      await page.render({ canvas, viewport }).promise

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Conversion du PDF en image impossible')
      if (cancelled) return
      objectUrl = URL.createObjectURL(blob)
      setState({ status: 'ready', src: objectUrl })
    })()
      .catch((err) => {
        if (cancelled) return
        console.error('[plan PDF] rendu impossible :', err)
        setState({ status: 'error', src: null })
      })
      .finally(() => destroy?.())

    return () => {
      cancelled = true
      destroy?.()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  return state
}
