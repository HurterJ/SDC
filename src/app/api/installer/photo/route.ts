import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const observation_id = formData.get('observation_id') as string
  const installer_token_id = formData.get('installer_token_id') as string

  if (!file || !observation_id || !installer_token_id) {
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

  const ext = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop() ?? 'jpg'
  const path = `${observation_id}/${uuidv4()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('photos')
    .upload(path, buffer, { contentType: file.type })

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: urlData } = await admin.storage.from('photos').createSignedUrl(path, 3600)
  const file_url = urlData?.signedUrl ?? path

  // Insérer dans observation_photos (sans uploaded_by, colonne rendue nullable via migration)
  const { error: insertErr } = await admin
    .from('observation_photos')
    .insert({ observation_id, file_url, file_path: path })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
  return NextResponse.json({ file_url })
}
