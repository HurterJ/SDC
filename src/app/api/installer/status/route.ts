import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInstallerToken, isObservationInProject } from '@/lib/installer/token'

// Statuts qu'un installateur peut poser (Validée reste réservée au conducteur)
const INSTALLER_STATUSES = ['resolue', 'contestee']

export async function POST(req: NextRequest) {
  const { observation_id, token, status } = await req.json()

  if (!observation_id || !token || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!INSTALLER_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()

  const installer = await getInstallerToken(admin, token)
  if (!installer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (installer.role !== 'installateur') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!(await isObservationInProject(admin, observation_id, installer.project_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const update: Record<string, unknown> = { status }
  if (status === 'resolue') update.resolved_at = new Date().toISOString()

  const { data, error } = await admin
    .from('observations')
    .update(update)
    .eq('id', observation_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
