import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInstallerToken, isObservationInProject } from '@/lib/installer/token'
import { v4 as uuidv4 } from 'uuid'
import { badRequest } from '@/lib/api/request'
import { MINUTE, rateLimit } from '@/lib/api/rate-limit'
import { MAX_PHOTO_BYTES } from '@/lib/validation'

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return badRequest('Invalid body')
  const file = formData.get('file')
  const observation_id = formData.get('observation_id')
  const token = formData.get('token')

  if (!(file instanceof File) || typeof observation_id !== 'string' || !observation_id || typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (file.size > MAX_PHOTO_BYTES) return badRequest('Photo trop lourde (20 Mo maximum).')

  const limited = rateLimit(req, 'installer-photo', token, { limit: 20, windowMs: 10 * MINUTE })
  if (limited) return limited

  const ext = IMAGE_EXTENSIONS[file.type]
  if (!ext) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })

  const admin = createAdminClient()

  const installer = await getInstallerToken(admin, token)
  if (!installer) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  if (!(await isObservationInProject(admin, observation_id, installer.project_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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
