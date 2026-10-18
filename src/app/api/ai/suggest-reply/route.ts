import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInstallerToken } from '@/lib/installer/token'
import { badRequest, cleanText, readJson } from '@/lib/api/request'
import { MINUTE, rateLimit } from '@/lib/api/rate-limit'
import { LIMITS } from '@/lib/validation'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (!body) return badRequest('Invalid body')
  const { token } = body
  // Textes bornés : ils partent dans le prompt et chaque appel est facturé
  const observation_title = cleanText(body.observation_title, LIMITS.observationTitle)
  const observation_description = cleanText(body.observation_description ?? '', LIMITS.observationDescription)
  if (!observation_title) return NextResponse.json({ error: 'Missing observation' }, { status: 400 })
  if (observation_description === null) return badRequest('Description trop longue.')
  const comments = (Array.isArray(body.comments) ? body.comments : [])
    .slice(-20)
    .filter((c): c is { author_id?: string; installer_name?: string; content: string } => !!c && typeof c.content === 'string')
    .map((c) => ({ ...c, content: c.content.slice(0, LIMITS.comment) }))

  // Route publique (page installateur sans session) : il faut une session ou un lien installateur valide
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) {
    const installer = await getInstallerToken(createAdminClient(), token)
    if (!installer || installer.role !== 'installateur') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const limited = rateLimit(req, 'ai-suggest-reply', user?.id ?? String(token), { limit: 20, windowMs: 10 * MINUTE })
  if (limited) return limited

  const commentsText = comments.length > 0
    ? comments
        .map((c) => `- ${c.author_id ? 'Conducteur' : (c.installer_name ?? 'Installateur')} : "${c.content}"`)
        .join('\n')
    : 'Aucun commentaire pour l\'instant.'

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Tu es un installateur sur un chantier BTP. Tu dois répondre à une réserve (observation de chantier).

Réserve : "${observation_title}"${observation_description ? `\nDescription : "${observation_description}"` : ''}

Historique des commentaires :
${commentsText}

Génère 3 réponses courtes et professionnelles que l'installateur pourrait envoyer.
- Variées : une confirmant la prise en charge, une demandant des précisions, une annonçant une résolution
- Ton professionnel, entre 5 et 20 mots chacune
- En français

Réponds UNIQUEMENT avec un JSON valide, sans markdown :
["réponse 1","réponse 2","réponse 3"]`,
    }],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json({ suggestions: parsed })
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        return NextResponse.json({ suggestions: JSON.parse(match[0]) })
      } catch { /* ignore */ }
    }
    return NextResponse.json({ error: 'Parse error' }, { status: 500 })
  }
}
