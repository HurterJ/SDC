export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { FolderOpen, Plus, ChevronRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, updated_at')
    .eq('archived', false)
    .order('updated_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Tableau de bord" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Mes projets</h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Nouveau projet
            </Link>
          </div>

          {!projects?.length ? (
            <div className="flex flex-col items-center py-16 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Aucun projet</p>
              <p className="text-slate-400 text-sm mt-1 mb-4">
                Créez votre premier projet pour commencer
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouveau projet
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{project.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mis à jour le {new Date(project.updated_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
