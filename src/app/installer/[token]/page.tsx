import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InstallerView from '@/components/installer/InstallerView'

interface Props {
  params: { token: string }
}

export default async function InstallerPage({ params }: Props) {
  const supabase = createClient()

  const { data: tokenData } = await supabase
    .from('installer_tokens')
    .select('*, projects(id, name, description)')
    .eq('token', params.token)
    .eq('is_active', true)
    .single()

  if (!tokenData) notFound()

  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Lien expiré</h1>
          <p className="text-slate-500">Ce lien d'accès a expiré. Contactez le conducteur de travaux.</p>
        </div>
      </div>
    )
  }

  const [{ data: observations }, { data: plans }] = await Promise.all([
    supabase
      .from('observations')
      .select('*, observation_photos(id, file_url)')
      .eq('project_id', tokenData.project_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('plans')
      .select('id, name, file_url')
      .eq('project_id', tokenData.project_id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <InstallerView
      token={tokenData}
      observations={observations ?? []}
      plans={plans ?? []}
    />
  )
}
