// En-têtes appliqués à toutes les réponses. Le certificat et la redirection HTTP → HTTPS
// relèvent de l'hébergeur ; HSTS demande ensuite au navigateur de ne plus jamais passer en HTTP.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Les liens installateur contiennent un token secret : seule l'origine part vers les autres sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Outil privé : aucune page ne doit apparaître dans un moteur de recherche
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Paquets Node uniquement : chargés tels quels côté serveur, sans passer par le bundler
  serverExternalPackages: ['puppeteer', 'exceljs'],
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
