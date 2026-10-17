import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export interface InstallerToken {
  id: string
  project_id: string
  name: string
  company: string | null
  role: string
  expires_at: string | null
  projects: { id: string; name: string; description: string | null } | null
}

// Retrouve un lien installateur actif et non expiré à partir de sa chaîne secrète
// (celle de l'URL /installer/[token]), jamais à partir de l'id de la ligne.
export async function getInstallerToken(admin: AdminClient, token: unknown): Promise<InstallerToken | null> {
  if (typeof token !== 'string' || !token) return null

  const { data } = await admin
    .from('installer_tokens')
    .select('id, project_id, name, company, role, expires_at, projects(id, name, description)')
    .eq('token', token)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return data as unknown as InstallerToken
}

// Vérifie que l'observation appartient bien au projet du lien
export async function isObservationInProject(admin: AdminClient, observationId: unknown, projectId: string) {
  if (typeof observationId !== 'string' || !observationId) return false

  const { data } = await admin
    .from('observations')
    .select('id')
    .eq('id', observationId)
    .eq('project_id', projectId)
    .maybeSingle()

  return !!data
}
