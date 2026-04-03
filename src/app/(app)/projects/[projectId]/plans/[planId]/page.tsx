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

  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', params.planId)
    .eq('project_id', params.projectId)
    .single()

  if (!plan) notFound()

  const { data: observations } = await supabase
    .from('observations')
    .select('*, observation_photos(id, file_url)')
    .eq('plan_id', params.planId)
    .order('created_at', { ascending: false })

  // Determine user role
  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', params.projectId)
    .eq('user_id', user.id)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', params.projectId)
    .single()

  const isOwner = project?.owner_id === user.id
  const role = isOwner ? 'conducteur' : (member?.role ?? 'lecteur')

  return (
    <PlanPageClient
      plan={plan}
      observations={observations ?? []}
      userId={user.id}
      role={role}
      projectId={params.projectId}
    />
  )
}
