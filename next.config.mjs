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
  // Puppeteer/canvas are node-only — exclude from Edge runtime
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'exceljs'],
  },
}

export default nextConfig
