import { GET as gatedGet } from '../../api/waitlist/stats/route';

// OS-6030: this non-/api path also dumped emails publicly.
export const dynamic = 'force-dynamic';
export { gatedGet as GET };
