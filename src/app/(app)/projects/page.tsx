export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import ProjectsClient from '@/components/projects/ProjectsClient'

export default async function ProjectsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', false)
    .order('updated_at', { ascending: false })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Projets" />
      <main className="flex-1 overflow-y-auto p-6">
        <ProjectsClient projects={projects || []} userId={user.id} />
      </main>
    </div>
  )
}
