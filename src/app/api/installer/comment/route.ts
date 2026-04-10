import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { observation_id, installer_token_id, installer_name, content, photo_url } = await req.json()

  if (!observation_id || !installer_token_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Valider le token
  const { data: token } = await admin
    .from('installer_tokens')
    .select('id, is_active')
    .eq('id', installer_token_id)
    .eq('is_active', true)
    .single()

  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const record: Record<string, unknown> = {
    observation_id,
    installer_token_id,
    installer_name,
    content: content || '',
  }
  if (photo_url) record.photo_url = photo_url

  const { data, error } = await admin
    .from('observation_comments')
    .insert(record)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
