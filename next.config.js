// @ts-check

const ORCHESTRATOR_URL = process.env.NEXT_PUBLIC_API_URL || process.env.ORCHESTRATOR_URL || 'https://orchestrator-production-1643.up.railway.app';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Wave 2: implicit-any TS debt noted; clean up in Wave 3 strict pass
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Prisma v7: keep WASM-based query compiler out of the webpack bundle so the
  // .wasm file is resolved from node_modules at runtime (not from a bundled path).
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  },
  // OS-1752: removed the /waitlist/stats → orchestrator rewrite.
  // The orchestrator has no /waitlist/stats route (returns 500).
  // A public Next.js route handler at src/app/waitlist/stats/route.ts
  // now serves the stats directly from the database.

  // De-prelaunch: the product is LIVE. /coming-soon was a stale
  // "reserve for July 7, 2026" page; retire it by redirecting to /signup.
  async redirects() {
    return [
      { source: '/coming-soon', destination: '/signup', permanent: false },
    ]
  },
}

module.exports = nextConfig
