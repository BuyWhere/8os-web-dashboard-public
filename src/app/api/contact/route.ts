import { NextResponse } from 'next/server';

interface ContactBody {
  name: string;
  email: string;
  subject?: string;
  message: string;
  honeypot?: string;
}

const IG_DISPATCH_URL = process.env.IG_DISPATCH_URL || 'https://ig-dispatch-production.up.railway.app';

function validate(body: unknown): { ok: true; data: ContactBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request body' };
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string' || !b.name.trim()) return { ok: false, error: 'Name is required' };
  if (typeof b.email !== 'string' || !b.email.includes('@')) return { ok: false, error: 'Valid email is required' };
  if (typeof b.message !== 'string' || !b.message.trim()) return { ok: false, error: 'Message is required' };
  return {
    ok: true,
    data: {
      name: b.name.trim(),
      email: b.email.trim(),
      subject: typeof b.subject === 'string' ? b.subject.trim() : '',
      message: b.message.trim(),
      honeypot: typeof b.honeypot === 'string' ? b.honeypot : '',
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = validate(body);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: result.error },
        { status: 400 }
      );
    }

    // Honeypot: silently swallow bot submissions
    if (result.data.honeypot) {
      return NextResponse.json({ status: 'received', message: 'OK' });
    }

    // Forward to ig-dispatch service (currently just acknowledges — full email via Resend pending OS-1127)
    const forward = await fetch(`${IG_DISPATCH_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: result.data.name,
        email: result.data.email,
        message: `[${result.data.subject || 'No subject'}]\n\n${result.data.message}`,
      }),
    }).catch(() => null);

    if (!forward || !forward.ok) {
      // Log to console for now; email notification pending OS-1127 Resend wire
      console.error('[contact] ig-dispatch unreachable', {
        name: result.data.name,
        email: result.data.email,
        subject: result.data.subject,
        messageLength: result.data.message.length,
      });
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE', message: 'Contact service temporarily unavailable. Please try one of the email addresses below.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'received',
      message: 'Thank you for your message. We will get back to you soon.',
    });
  } catch (err) {
    console.error('[contact] error', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
