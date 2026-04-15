import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
          <p className="text-slate-500">Ce lien d&apos;accès a expiré. Contactez le conducteur de travaux.</p>
        </div>
      </div>
    )
  }

  const [{ data: observations }, { data: plans }] = await Promise.all([
    supabase
      .from('observations')
      .select('*, observation_photos(id, file_url, file_path)')
      .eq('project_id', tokenData.project_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('plans')
      .select('id, name, file_url')
      .eq('project_id', tokenData.project_id)
      .order('created_at', { ascending: true }),
  ])

  // Générer des URLs signées pour toutes les photos (bucket privé)
  const admin = createAdminClient()
  const obsWithSignedUrls = await Promise.all(
    (observations ?? []).map(async (obs: any) => {
      if (!obs.observation_photos?.length) return obs
      const photos = await Promise.all(
        obs.observation_photos.map(async (p: any) => {
          if (!p.file_path) return p
          const { data, error } = await admin.storage.from('photos').createSignedUrl(p.file_path, 3600)
          if (error) console.error('[installer] signed URL error:', error.message, 'path:', p.file_path)
          return { ...p, file_url: data?.signedUrl ?? null }
        })
      )
      return { ...obs, observation_photos: photos }
    })
  )

  // Charger le dernier commentaire par observation
  const observationIds = (observations ?? []).map((o: any) => o.id)
  const lastCommentsMap: Record<string, any> = {}
  if (observationIds.length > 0) {
    const { data: allComments } = await supabase
      .from('observation_comments')
      .select('id, observation_id, content, created_at, installer_name, author_id')
      .in('observation_id', observationIds)
      .order('created_at', { ascending: false })
    if (allComments) {
      for (const c of allComments) {
        if (!lastCommentsMap[c.observation_id]) lastCommentsMap[c.observation_id] = c
      }
    }
  }

  return (
    <InstallerView
      token={tokenData}
      observations={obsWithSignedUrls}
      plans={plans ?? []}
      lastComments={lastCommentsMap}
      tokenString={params.token}
    />
  )
}
