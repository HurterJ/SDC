'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import { FolderOpen, Plus, MapPin, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
  projects: Project[]
  userId: string
}

export default function ProjectsClient({ projects: initial, userId }: Props) {
  const [projects, setProjects] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description: description || null, address: address || null, owner_id: userId })
      .select()
      .single()
    if (!error && data) {
      setProjects([data, ...projects])
      setShowModal(false)
      setName('')
      setDescription('')
      setAddress('')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mes projets</h2>
          <p className="text-sm text-slate-500 mt-0.5">{projects.length} projet{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau projet
        </button>
      </div>

      {!projects.length ? (
        <div className="text-center py-20">
          <FolderOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg">Aucun projet</p>
          <p className="text-slate-400 text-sm mt-1">Créez votre premier projet de suivi de réserves</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <FolderOpen className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1 truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-2">{project.description}</p>
              )}
              {project.address && (
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{project.address}</span>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                Mis à jour le {new Date(project.updated_at).toLocaleDateString('fr-FR')}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Nouveau projet</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={createProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du projet <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="Ex: Immeuble Résidence Les Pins"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none"
                  placeholder="Description du chantier..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  placeholder="123 rue de la Paix, 75001 Paris"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer le projet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
