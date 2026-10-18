import type { MetadataRoute } from 'next'

// Outil privé : rien à indexer (pas de sitemap). Les pages portent aussi un en-tête noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
