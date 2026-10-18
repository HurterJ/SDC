import { NextResponse, type NextRequest } from 'next/server'

// Corps JSON de la requête, ou null s'il est absent, invalide ou n'est pas un objet
export async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

// Texte nettoyé (espaces de bord retirés), ou null si ce n'est pas une chaîne ou s'il dépasse max
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length <= max ? text : null
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}
