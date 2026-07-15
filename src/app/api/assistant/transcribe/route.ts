/**
 * Assistant Transcribe API Route (stub)
 *
 * Accepts an audio blob (multipart/form-data, field "audio") from the Coach
 * mic and returns a transcription. No server-side STT provider is wired yet,
 * so this returns a graceful "coming soon" response. The Coach prefers the
 * browser's on-device Web Speech API where supported; this endpoint is the
 * MediaRecorder fallback path.
 *
 * When an STT provider is added, transcribe the received audio here and
 * return { text: "..." }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    // Drain the form so the request body is consumed cleanly.
    try {
      const form = await request.formData()
      const audio = form.get('audio')
      if (!audio) {
        return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
      }
    } catch {
      // Ignore parse issues; still return a graceful message below.
    }

    return NextResponse.json({
      text: '',
      message: 'Voice transcription is coming soon. Try typing, or use a browser with on-device speech input.',
    })
  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
