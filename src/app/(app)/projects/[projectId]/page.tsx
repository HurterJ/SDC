import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { Map, ListChecks, Users, Plus, ChevronRight } from 'lucide-react'

interface Props {
  params: { projectId: string }
}

export default async function ProjectPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single()

  if (!project) notFound()

  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, created_at')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  const { data: observations } = await supabase
    .from('observations')
    .select('id, status')
    .eq('project_id', params.projectId)

  const open = observations?.filter((o) => o.status === 'ouverte').length ?? 0
  const inProgress = observations?.filter((o) => o.status === 'en_cours').length ?? 0
  const total = observations?.length ?? 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={project.name} />
      <main className="flex-1 overflow-y-auto p-6">
        {project.description && (
          <p className="text-slate-500 mb-6">{project.description}</p>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-sm text-slate-500 mt-0.5">Réserves totales</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{open}</p>
            <p className="text-sm text-red-600 mt-0.5">Ouvertes</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{inProgress}</p>
            <p className="text-sm text-orange-600 mt-0.5">En cours</p>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href={`/projects/${params.projectId}/observations`}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ListChecks className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Réserves / Observations</h3>
              <p className="text-sm text-slate-500">{total} au total</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>

          <Link
            href={`/projects/${params.projectId}/members`}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Membres & Accès</h3>
              <p className="text-sm text-slate-500">Gérer les intervenants</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        </div>

        {/* Plans */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-slate-600" />
              <h2 className="font-semibold text-slate-800">Plans</h2>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{plans?.length ?? 0}</span>
            </div>
            <Link
              href={`/projects/${params.projectId}/plans/new`}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Ajouter un plan
            </Link>
          </div>

          {!plans?.length ? (
            <div className="text-center py-12">
              <Map className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Aucun plan chargé</p>
              <p className="text-slate-400 text-sm mt-1">Ajoutez un plan PDF ou image pour y placer des observations</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={`/projects/${params.projectId}/plans/${plan.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Map className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{plan.name}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(plan.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
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
