import { GET as countGet } from '../../api/waitlist/count/route';

// Re-export the /api/waitlist/count handler at the public /waitlist/count path.
// Railway frontend (telly.8os.ai) doesn't have Next.js rewrites so it needs
// an explicit route handler. Mirrors the /waitlist/stats → api/waitlist/stats
// pattern established in OS-1752/OS-6030.
export const dynamic = 'force-dynamic';
export { countGet as GET };
