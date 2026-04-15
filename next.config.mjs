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
  webpack: (config) => {
    // Fix react-pdf / pdfjs-dist: these optional native modules don't exist
    // in browser context and cause /_next/undefined chunk load errors
    config.resolve.alias.canvas = false
    config.resolve.alias.encoding = false

    // pdfjs-dist v4 is ESM-strict (.mjs) and requires full extensions.
    // Tell webpack to relax this so react-pdf can import it properly.
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: { fullySpecified: false },
    })

    return config
  },
}

export default nextConfig
