import { POST } from '../route';

// OS-6030: apex/www POST /api/waitlist/join was 404 HTML because only
// POST /api/waitlist existed. The canonical orchestrator path is
// /waitlist/join; clients and probes hit /api/waitlist/join on the
// frontend origin. Re-export the same handler.
export const dynamic = 'force-dynamic';
export { POST };
