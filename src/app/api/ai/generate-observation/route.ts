import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { badRequest, cleanText, readJson } from '@/lib/api/request'
import { MINUTE, rateLimit } from '@/lib/api/rate-limit'
import { LIMITS } from '@/lib/validation'

const client = new Anthropic()

const CATEGORIES = [
  'Gros œuvre', 'Second œuvre', 'Électricité', 'Plomberie',
  'CVC', 'Menuiseries', 'Revêtements', 'Peinture', 'Autre',
]

export async function POST(req: NextRequest) {
  const body = await readJson(req)
  if (!body) return badRequest('Invalid body')
  const raw = cleanText(body.raw, LIMITS.aiInput)
  if (raw === null) return badRequest(`Description trop longue (${LIMITS.aiInput} caractères maximum).`)
  if (!raw) return NextResponse.json({ error: 'Missing input' }, { status: 400 })

  // La session est vérifiée par le middleware ; la limite porte sur l'adresse IP
  const limited = rateLimit(req, 'ai-generate', null, { limit: 20, windowMs: 10 * MINUTE })
  if (limited) return limited

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Tu es un assistant pour un logiciel de gestion de réserves de chantier (BTP).

À partir de cette description brute d'une observation de chantier, génère un objet JSON structuré.

Description brute : "${raw}"

Catégories disponibles : ${CATEGORIES.join(', ')}
Priorités disponibles : basse, normale, haute, critique

Règles :
- title : court, précis, professionnel (max 80 caractères)
- description : 1 à 3 phrases détaillées, ton professionnel BTP
- category : choisir la plus pertinente parmi les disponibles, ou null si incertain
- priority : évaluer selon l'urgence et le risque (critique = sécurité/blocage, haute = impact fort, normale = standard, basse = cosmétique)

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication :
{"title":"...","description":"...","category":"...","priority":"..."}`,
    }],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    // Tentative d'extraction si le modèle a ajouté du texte autour
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return NextResponse.json(JSON.parse(match[0]))
      } catch { /* ignore */ }
    }
    return NextResponse.json({ error: 'Parse error' }, { status: 500 })
  }
}
