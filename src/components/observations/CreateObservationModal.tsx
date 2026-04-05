'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { Observation, ObservationPriority } from '@/types'
import { X, Loader2, Upload, ImageIcon } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  projectId: string
  planId: string
  pinX: number
  pinY: number
  userId: string
  onClose: () => void
  onCreated: (obs: Observation) => void
}

const PRIORITIES: { value: ObservationPriority; label: string }[] = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'critique', label: 'Critique' },
]

const CATEGORIES = [
  'Gros \u0153uvre', 'Second \u0153uvre', '\u00c9lectricit\u00e9', 'Plomberie',
  'CVC', 'Menuiseries', 'Rev\u00eatements', 'Peinture', 'Autre',
]

export default function CreateObservationModal({
  projectId, planId, pinX, pinY, userId, onClose, onCreated,
}: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ObservationPriority>('normale')
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadStep, setUploadStep] = useState<'idle' | 'creating' | 'uploading'>('idle')
  const supabase = createClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...acceptedFiles].slice(0, 5))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5,
  })

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setUploadStep('creating')

    const { data, error } = await supabase
      .from('observations')
      .insert({
        project_id: projectId,
        plan_id: planId,
        plan_x: pinX,
        plan_y: pinY,
        title,
        description: description || null,
        priority,
        category: category || null,
        due_date: dueDate || null,
        created_by: userId,
        status: 'ouverte',
      })
      .select()
      .single()

    if (error || !data) {
      setLoading(false)
      setUploadStep('idle')
      return
    }

    if (selectedFiles.length > 0) {
      setUploadStep('uploading')
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop()
        const path = `${data.id}/${uuidv4()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
          await supabase.from('observation_photos').insert({
            observation_id: data.id,
            file_url: urlData.publicUrl,
            file_path: path,
            uploaded_by: userId,
          })
        }
      }
    }

    onCreated(data as Observation)
    setLoading(false)
    setUploadStep('idle')
  }

  const stepLabel = uploadStep === 'creating'
    ? 'Cr\u00e9ation...'
    : uploadStep === 'uploading'
    ? `Upload photos (${selectedFiles.length})...`
    : "Cr\u00e9er l'observation"

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Nouvelle observation</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form id="create-obs-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="Ex: Fissure sur le mur porteur..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
              placeholder="Description d\u00e9taill\u00e9e..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priorit\u00e9</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ObservationPriority)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cat\u00e9gorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              >
                <option value="">{`\u2014 S\u00e9lectionner \u2014`}</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date d'\u00e9ch\u00e9ance</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Photos <span className="text-slate-400 font-normal">(optionnel, max 5)</span>
            </label>

            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {selectedFiles.length < 5 && (
                  <div
                    {...getRootProps()}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-300 hover:bg-slate-50 transition-colors"
                  >
                    <input {...getInputProps()} />
                    <ImageIcon className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </div>
            )}

            {selectedFiles.length === 0 && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-xs text-slate-500">
                  {isDragActive ? 'D\u00e9posez ici' : 'Glisser des photos ou cliquer'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP \u2014 10 Mo max</p>
              </div>
            )}
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="create-obs-form"
            disabled={loading || !title.trim()}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {stepLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
