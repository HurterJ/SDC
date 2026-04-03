'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, File, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'

export default function NewPlanPage({ params }: { params: { projectId: string } }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !name) return
    setLoading(true)
    setError(null)

    const ext = file.name.split('.').pop()
    const path = `${params.projectId}/${uuidv4()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('plans')
      .upload(path, file)

    if (uploadError) {
      setError(`Erreur upload : ${uploadError.message}`)
      setLoading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('plans').getPublicUrl(path)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: plan, error: insertError } = await supabase
      .from('plans')
      .insert({
        project_id: params.projectId,
        name,
        description: description || null,
        file_url: urlData.publicUrl,
        file_path: path,
        created_by: user!.id,
      })
      .select()
      .single()

    if (insertError) {
      setError(`Erreur : ${insertError.message}`)
    } else {
      router.push(`/projects/${params.projectId}/plans/${plan.id}`)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-slate-200">
        <Link href={`/projects/${params.projectId}`} className="p-1.5 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="font-semibold text-slate-800">Ajouter un plan</h1>
      </div>

      <main className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du plan <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              placeholder="Ex: Niveau RDC — Électricité"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
              placeholder="Description optionnelle..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fichier <span className="text-red-500">*</span>
            </label>

            {file ? (
              <div className="flex items-center gap-3 p-4 border border-green-200 bg-green-50 rounded-lg">
                <File className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-1 hover:bg-green-100 rounded">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">
                  {isDragActive ? 'Déposez le fichier ici' : 'Glisser-déposer ou cliquer'}
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP, PDF — 50 Mo max</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <Link
              href={`/projects/${params.projectId}`}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-center text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading || !name || !file}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Upload en cours...' : 'Enregistrer le plan'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
