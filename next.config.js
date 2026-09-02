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
      // OS-2618: legacy Clerk auth paths → canonical routes. Belt-and-suspenders
      // alongside the middleware redirect (next.config runs at the edge before
      // Clerk, so /signin never 404s even if middleware matcher misses it).
      // OS-2618: legacy Clerk auth paths → canonical routes. Belt-and-suspenders
      // alongside the middleware redirect (next.config runs at the edge before
      // Clerk, so /signin never 404s even if middleware matcher misses it).
      { source: '/signin', destination: '/login', permanent: false },
      { source: '/sign-in', destination: '/login', permanent: false },
      { source: '/sign-up', destination: '/signup', permanent: false },
      // OS-3550: legacy/dead /famous was the old famous archetypes URL.
      // /archetypes/famous/<name> pages (66 in sitemap) prefetch /famous?_rsc=<id>
      // which returns 404. Redirect to the canonical /archetypes/famous index.
      // next.config redirect compiles into the server binary at build time,
      // unlike middleware which may not initialize for bare 404 routes.
      { source: '/famous', destination: '/archetypes/famous', permanent: false },
      // OS-5916: CLI-style /--help and /help are not product routes; send users
      // to the existing contact/support page instead of a generic 404.
      { source: '/help', destination: '/contact', permanent: false },
      { source: '/--help', destination: '/contact', permanent: false },
    ]
  },
}

module.exports = nextConfig
