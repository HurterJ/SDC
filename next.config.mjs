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
}

export default nextConfig
