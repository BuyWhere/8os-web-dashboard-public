import { GET as countGet } from '../waitlist/count/route';

// OS-7223: /api/count was 404 on every host (www/api/apex/telly/8os)
// because the only public waitlist counter lives at /api/waitlist/count.
// Heartbeats, probes, and older clients still hit the shorthand.
//
// vercel.json rewrites do not apply on Railway standalone builds (same
// pattern as /api/join in OS-6991). Re-export the canonical handler.
export const dynamic = 'force-dynamic';
export { countGet as GET };
