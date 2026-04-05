import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PlanPageClient from '@/components/plans/PlanPageClient'

interface Props {
  params: { projectId: string; planId: string }
}

export default async function PlanPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: plan }, { data: project }, { data: allPlans }, { data: observations }, { data: member }] =
    await Promise.all([
      supabase.from('plans').select('*').eq('id', params.planId).eq('project_id', params.projectId).single(),
      supabase.from('projects').select('owner_id, name').eq('id', params.projectId).single(),
      supabase.from('plans').select('id, name').eq('project_id', params.projectId).order('created_at', { ascending: true }),
      supabase.from('observations').select('*, observation_photos(id, file_url)').eq('plan_id', params.planId).order('created_at', { ascending: false }),
      supabase.from('project_members').select('role').eq('project_id', params.projectId).eq('user_id', user.id).single(),
    ])

  if (!plan) notFound()

  const isOwner = project?.owner_id === user.id
  const role = isOwner ? 'conducteur' : (member?.role ?? 'lecteur')

  return (
    <PlanPageClient
      plan={plan}
      plans={allPlans ?? []}
      projectName={project?.name ?? ''}
      observations={observations ?? []}
      userId={user.id}
      role={role}
      projectId={params.projectId}
    />
  )
}
