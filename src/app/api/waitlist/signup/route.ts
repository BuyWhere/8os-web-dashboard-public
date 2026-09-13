import { POST } from '../route';

// OS-7061: POST /api/waitlist/signup returned 404 HTML because only
// /api/waitlist (and /api/waitlist/join) existed. External integrations
// were still POSTing to /signup, which silently failed after the Clerk
// auth migration. Re-export the same handler as /join.
export const dynamic = 'force-dynamic';
export { POST };
