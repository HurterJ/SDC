import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import MembersClient from '@/components/members/MembersClient'

export const metadata: Metadata = { title: 'Membres du projet' }

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function MembersPage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  // Only owner/conducteur can manage
  const isOwner = project.owner_id === user.id
  if (!isOwner) {
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()
    if (member?.role !== 'conducteur') redirect(`/projects/${projectId}`)
  }

  const { data: tokens } = await supabase
    .from('installer_tokens')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={`Accès — ${project.name}`} />
      <main className="flex-1 overflow-y-auto p-6">
        <MembersClient
          project={project}
          tokens={tokens ?? []}
          userId={user.id}
          projectId={projectId}
        />
      </main>
    </div>
  )
}
