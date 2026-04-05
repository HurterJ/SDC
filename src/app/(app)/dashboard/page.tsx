export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { FolderOpen, AlertCircle, CheckCircle2, Clock, Plus, ChevronRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, updated_at')
    .eq('archived', false)
    .order('updated_at', { ascending: false })

  const projectIds = projects?.map((p) => p.id) ?? []

  const { data: obsCounts } = projectIds.length > 0
    ? await supabase
        .from('observations')
        .select('project_id, status')
        .in('project_id', projectIds)
    : { data: [] }

  // Grouper par projet
  const statsMap: Record<string, { total: number; open: number; resolved: number }> = {}
  obsCounts?.forEach((o) => {
    if (!statsMap[o.project_id]) statsMap[o.project_id] = { total: 0, open: 0, resolved: 0 }
    statsMap[o.project_id].total++
    if (o.status === 'ouverte' || o.status === 'en_cours') statsMap[o.project_id].open++
    if (o.status === 'resolue' || o.status === 'validee') statsMap[o.project_id].resolved++
  })

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
              {projects.map((project) => {
                const s = statsMap[project.id] ?? { total: 0, open: 0, resolved: 0 }
                return (
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
                      {/* Compteurs */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {s.open > 0 && (
                          <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            {s.open} ouverte{s.open > 1 ? 's' : ''}
                          </span>
                        )}
                        {s.resolved > 0 && (
                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {s.resolved} résolue{s.resolved > 1 ? 's' : ''}
                          </span>
                        )}
                        {s.total === 0 && (
                          <span className="text-xs text-slate-400">Aucune réserve</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
