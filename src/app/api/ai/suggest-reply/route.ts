import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { observation_title, observation_description, comments } = await req.json()
  if (!observation_title) return NextResponse.json({ error: 'Missing observation' }, { status: 400 })

  const commentsText = (comments ?? []).length > 0
    ? (comments as { author_id?: string; installer_name?: string; content: string }[])
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
