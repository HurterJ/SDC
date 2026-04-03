import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import MembersClient from '@/components/members/MembersClient'

interface Props {
  params: { projectId: string }
}

export default async function MembersPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.projectId)
    .single()

  if (!project) notFound()

  // Only owner/conducteur can manage
  const isOwner = project.owner_id === user.id
  if (!isOwner) {
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', params.projectId)
      .eq('user_id', user.id)
      .single()
    if (member?.role !== 'conducteur') redirect(`/projects/${params.projectId}`)
  }

  const { data: tokens } = await supabase
    .from('installer_tokens')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={`Accès — ${project.name}`} />
      <main className="flex-1 overflow-y-auto p-6">
        <MembersClient
          project={project}
          tokens={tokens ?? []}
          userId={user.id}
          projectId={params.projectId}
        />
      </main>
    </div>
  )
}
