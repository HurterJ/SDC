import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInstallerToken, isObservationInProject } from '@/lib/installer/token'
import { badRequest, cleanText, readJson } from '@/lib/api/request'
import { MINUTE, rateLimit } from '@/lib/api/rate-limit'
import { LIMITS } from '@/lib/validation'

// Liste des commentaires d'une observation (la page installateur n'a pas de session)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const observation_id = req.nextUrl.searchParams.get('observation_id')

  if (!token || !observation_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  const installer = await getInstallerToken(admin, token)
  if (!installer) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  if (!(await isObservationInProject(admin, observation_id, installer.project_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('observation_comments')
    .select('*')
    .eq('observation_id', observation_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (!body) return badRequest('Invalid body')
  const { observation_id, token, photo_url } = body
  const content = cleanText(body.content ?? '', LIMITS.comment)

  if (!observation_id || typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (content === null) return badRequest(`Commentaire trop long (${LIMITS.comment} caractères maximum).`)

  // Seules les photos déposées par /api/installer/photo sont acceptées
  const photoPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/photos/`
  const photo = typeof photo_url === 'string' && photo_url.startsWith(photoPrefix) ? photo_url : null
  if (!content && !photo) return badRequest('Le commentaire est vide.')

  const limited = rateLimit(req, 'installer-comment', token, { limit: 30, windowMs: 5 * MINUTE })
  if (limited) return limited

  const admin = createAdminClient()

  const installer = await getInstallerToken(admin, token)
  if (!installer) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  if (!(await isObservationInProject(admin, observation_id, installer.project_id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Le nom affiché vient du lien, pas du navigateur
  const record: Record<string, unknown> = {
    observation_id,
    installer_token_id: installer.id,
    installer_name: installer.name,
    content,
  }
  if (photo) record.photo_url = photo

  const { data, error } = await admin
    .from('observation_comments')
    .insert(record)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
