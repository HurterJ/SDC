import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import ObservationsListClient from '@/components/observations/ObservationsListClient'

interface Props {
  params: { projectId: string }
}

export default async function ObservationsPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, owner_id')
    .eq('id', params.projectId)
    .single()

  if (!project) notFound()

  const { data: observations } = await supabase
    .from('observations')
    .select('*, observation_photos(id, file_url)')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', params.projectId)
    .eq('user_id', user.id)
    .single()

  const isOwner = project.owner_id === user.id
  const role = isOwner ? 'conducteur' : (member?.role ?? 'lecteur')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={`Réserves — ${project.name}`} />
      <main className="flex-1 overflow-y-auto p-6">
        <ObservationsListClient
          observations={observations ?? []}
          userId={user.id}
          role={role}
          projectId={params.projectId}
        />
      </main>
    </div>
  )
}
