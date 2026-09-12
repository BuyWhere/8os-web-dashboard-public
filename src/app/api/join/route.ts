import { POST } from '../waitlist/route';

// OS-6991: /api/join was returning 404 on Railway standalone builds because
// vercel.json rewrites only apply on Vercel. Railway standalone builds ignore
// vercel.json and rely on Next.js App Router route handlers.
//
// The canonical waitlist handler lives at /api/waitlist (src/app/api/waitlist/route.ts).
// This route re-exports it so clients that hit /api/join (a common shorthand)
// get the same working handler. Pattern matches /api/waitlist/join/route.ts.
export const dynamic = 'force-dynamic';
export { POST };
