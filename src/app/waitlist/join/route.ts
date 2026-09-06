import { NextRequest } from 'next/server';
import { POST as waitlistPost } from '../../api/waitlist/route';

// OS-6030: expose the /api/waitlist POST handler at the public /waitlist/join
// path. Railway frontend (www.8os.ai) has no Next.js rewrites so it needs
// an explicit public route handler — without this, www returns 404 on POST
// /waitlist/join while apex (with its own server) returns 200. Keep this as
// a real function because standalone production builds omit re-export-only
// alias route files (OS-6074).
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return waitlistPost(request);
}
