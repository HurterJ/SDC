import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { observation_id, installer_token_id, status } = await req.json()

  if (!observation_id || !installer_token_id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Valider le token actif
  const { data: token } = await admin
    .from('installer_tokens')
    .select('id, is_active, role')
    .eq('id', installer_token_id)
    .eq('is_active', true)
    .single()

  if (!token || token.role !== 'installateur') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
