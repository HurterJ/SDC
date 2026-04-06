'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { compressImage, isMobileDevice } from '@/lib/utils/image'
import { ObservationPhoto } from '@/types'
import { Upload, X, Loader2, ImageIcon, ZoomIn, Camera } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  observationId: string
  userId: string | null
  canUpload: boolean
}

export default function PhotoUpload({ observationId, userId, canUpload }: Props) {
  const [photos, setPhotos] = useState<(ObservationPhoto & { signedUrl?: string })[]>([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [mobile, setMobile] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => { setMobile(isMobileDevice()) }, [])

  async function loadPhotos() {
    const { data } = await supabase
      .from('observation_photos')
      .select('*')
      .eq('observation_id', observationId)
      .order('created_at')
    if (!data) return

    // Générer signed URLs pour le bucket privé
    const withUrls = await Promise.all(
      data.map(async (p) => {
        if (!p.file_path) return { ...p, signedUrl: p.file_url }
        const { data: signed } = await supabase.storage.from('photos').createSignedUrl(p.file_path, 3600)
        return { ...p, signedUrl: signed?.signedUrl ?? p.file_url }
      })
    )
    setPhotos(withUrls)
  }

  useEffect(() => {
    loadPhotos()

    // Temps réel — nouvelles photos (ex: ajoutées par l'installateur)
    const channel = supabase
      .channel(`photos:${observationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'observation_photos', filter: `observation_id=eq.${observationId}` },
        () => { loadPhotos() } // reload pour avoir signed URL
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observationId])

  async function uploadFiles(rawFiles: File[]) {
    if (!canUpload || uploading || rawFiles.length === 0) return
    setUploading(true)
    for (const raw of rawFiles) {
      const file = await compressImage(raw)
      const path = `${observationId}/${uuidv4()}.webp`
      const { error: upErr } = await supabase.storage
        .from('photos').upload(path, file, { contentType: 'image/webp' })
      if (!upErr) {
        const record: Record<string, string> = { observation_id: observationId, file_url: path, file_path: path }
        if (userId) record.uploaded_by = userId
        const { data: inserted } = await supabase
          .from('observation_photos')
          .insert(record)
          .select()
          .single()
        if (inserted) {
          const { data: signed } = await supabase.storage.from('photos').createSignedUrl(path, 3600)
          setPhotos((prev) => [...prev, { ...inserted, signedUrl: signed?.signedUrl ?? path }])
        }
      }
    }
    setUploading(false)
  }

  const onDrop = useCallback(
    (accepted: File[]) => uploadFiles(accepted),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpload, uploading, observationId, userId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    disabled: !canUpload || uploading,
    maxSize: 20 * 1024 * 1024,
  })

  function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length) uploadFiles(files)
    e.target.value = ''
  }

  async function deletePhoto(photo: ObservationPhoto) {
    await supabase.storage.from('photos').remove([photo.file_path])
    await supabase.from('observation_photos').delete().eq('id', photo.id)
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Photos</h4>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
              <img src={photo.signedUrl ?? photo.file_url} alt={photo.caption ?? 'Photo'} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => setPreview(photo.signedUrl ?? photo.file_url)} className="p-1 bg-white rounded-full hover:bg-slate-100">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
                </button>
                {canUpload && (
                  <button onClick={() => deletePhoto(photo)} className="p-1 bg-white rounded-full hover:bg-red-50">
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleCameraCapture} />

          {mobile ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
                className="flex flex-col items-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-300 hover:bg-slate-50 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Camera className="w-5 h-5 text-slate-400" />}
                <span className="text-xs text-slate-500">{uploading ? 'Upload...' : 'Prendre photo'}</span>
              </button>
              <div {...getRootProps()}
                className="flex flex-col items-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-300 hover:bg-slate-50 transition-colors cursor-pointer">
                <input {...getInputProps()} />
                <ImageIcon className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-500">Depuis la galerie</span>
              </div>
            </div>
          ) : (
            <div {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}>
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs">Compression et upload...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <p className="text-xs text-slate-500">
                    {isDragActive ? 'Déposez ici' : 'Glisser des photos ou cliquer'}
                  </p>
                  <p className="text-xs text-slate-400">JPG, PNG, WebP — 20 Mo max · compressées auto</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!photos.length && !canUpload && (
        <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
          <ImageIcon className="w-8 h-8" />
          <p className="text-xs">Aucune photo</p>
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4" onClick={() => setPreview(null)}>
          <img src={preview} alt="Aperçu" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
