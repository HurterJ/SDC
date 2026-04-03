'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { ObservationPhoto } from '@/types'
import { Upload, X, Loader2, ImageIcon, ZoomIn } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  observationId: string
  userId: string
  canUpload: boolean
}

export default function PhotoUpload({ observationId, userId, canUpload }: Props) {
  const [photos, setPhotos] = useState<ObservationPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadPhotos() {
      const { data } = await supabase
        .from('observation_photos')
        .select('*')
        .eq('observation_id', observationId)
        .order('created_at')
      if (data) setPhotos(data)
    }
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observationId])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!canUpload || uploading) return
      setUploading(true)

      for (const file of acceptedFiles) {
        const ext = file.name.split('.').pop()
        const path = `${observationId}/${uuidv4()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(path, file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
          const { data } = await supabase
            .from('observation_photos')
            .insert({
              observation_id: observationId,
              file_url: urlData.publicUrl,
              file_path: path,
              uploaded_by: userId,
            })
            .select()
            .single()
          if (data) setPhotos((prev) => [...prev, data])
        }
      }

      setUploading(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpload, uploading, observationId, userId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    disabled: !canUpload || uploading,
    maxSize: 10 * 1024 * 1024, // 10 MB
  })

  async function deletePhoto(photo: ObservationPhoto) {
    await supabase.storage.from('photos').remove([photo.file_path])
    await supabase.from('observation_photos').delete().eq('id', photo.id)
    setPhotos(photos.filter((p) => p.id !== photo.id))
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Photos</h4>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
              <img
                src={photo.file_url}
                alt={photo.caption ?? 'Photo'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setPreview(photo.file_url)}
                  className="p-1 bg-white rounded-full hover:bg-slate-100"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
                </button>
                {canUpload && (
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="p-1 bg-white rounded-full hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {canUpload && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs">Upload en cours...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="w-5 h-5 text-slate-400" />
              <p className="text-xs text-slate-500">
                {isDragActive ? 'Déposez ici' : 'Glisser des photos ou cliquer'}
              </p>
              <p className="text-xs text-slate-400">JPG, PNG, WebP — 10 Mo max</p>
            </div>
          )}
        </div>
      )}

      {!photos.length && !canUpload && (
        <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
          <ImageIcon className="w-8 h-8" />
          <p className="text-xs">Aucune photo</p>
        </div>
      )}

      {/* Preview lightbox */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Aperçu" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
