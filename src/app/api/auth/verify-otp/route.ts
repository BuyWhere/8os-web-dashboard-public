import { NextResponse } from "next/server"

// RETIRED 2026-07-10: legacy custom password/OTP auth removed. Clerk is now the
// single front door (see /login, /signup rendering <SignIn>/<SignUp>). This
// endpoint is intentionally dead so it can never run as a parallel auth system.
const GONE = {
  error: "This endpoint has been retired. Authentication is handled by Clerk at /login and /signup.",
}

export async function POST() {
  return NextResponse.json(GONE, { status: 410 })
}

export async function GET() {
  return NextResponse.json(GONE, { status: 410 })
}
