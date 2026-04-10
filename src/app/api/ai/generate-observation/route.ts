import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CATEGORIES = [
  'Gros œuvre', 'Second œuvre', 'Électricité', 'Plomberie',
  'CVC', 'Menuiseries', 'Revêtements', 'Peinture', 'Autre',
]

export async function POST(req: NextRequest) {
  const { raw } = await req.json()
  if (!raw?.trim()) return NextResponse.json({ error: 'Missing input' }, { status: 400 })

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
