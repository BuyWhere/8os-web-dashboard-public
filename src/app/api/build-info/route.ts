import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
    buildTime: process.env.BUILD_TIME || 'unknown',
    nodeEnv: process.env.NODE_ENV,
  });
}
