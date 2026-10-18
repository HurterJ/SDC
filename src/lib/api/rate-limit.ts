import { NextResponse, type NextRequest } from 'next/server'

// Limiteur à fenêtre fixe, en mémoire. Il protège contre les envois en rafale (spam, script,
// double clic répété) et limite le coût des appels à l'API d'IA. Le compteur est propre à
// chaque instance du serveur : sur un hébergement qui en lance plusieurs, la limite réelle est
// plus haute. Pour une limite stricte, il faudrait un stockage partagé (Redis, Upstash…).
const buckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'inconnue'
}

/**
 * Compte une requête pour `scope` + `identity` (+ adresse IP).
 * Renvoie une réponse 429 si la limite est atteinte, sinon null.
 */
export function rateLimit(
  req: NextRequest,
  scope: string,
  identity: string | null | undefined,
  { limit, windowMs }: { limit: number; windowMs: number }
): NextResponse | null {
  const now = Date.now()
  const key = `${scope}:${identity ?? '-'}:${clientIp(req)}`

  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  bucket.count++
  if (bucket.count <= limit) return null

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
  return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

export const MINUTE = 60_000
