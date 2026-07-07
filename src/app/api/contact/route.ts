import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createTransport } from 'nodemailer'

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
})

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    const first = Object.values(issues)[0]?.[0] ?? 'Validation failed'
    return NextResponse.json({ error: first }, { status: 400 })
  }

  const { name, email, subject, message } = parsed.data

  // Extra format check
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  // Honeypot — caller shouldn't send a website field, but guard anyway.
  if (typeof (body as Record<string, unknown>).website === 'string') {
    // Silently succeed so bots don't retry
    return NextResponse.json({
      success: true,
      message: "Thanks! We'll be in touch within 1 business day.",
    })
  }

  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL ?? 'hello@8os.ai'
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const fromAddr = process.env.SMTP_FROM ?? 'noreply@8os.ai'

  // If no SMTP is configured, log and return success so the form still feels
  // responsive while a human configures the transport.
  if (!smtpHost) {
    console.log('[contact] SMTP not configured — would have sent:', {
      from: email,
      name,
      subject,
      message: message.slice(0, 100),
    })
    return NextResponse.json({
      success: true,
      message: "Thanks! We'll be in touch within 1 business day.",
    })
  }

  const transport = createTransport({
    host: smtpHost,
    port: smtpPort,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    secure: smtpPort === 465,
  })

  try {
    await transport.sendMail({
      from: `"8os Contact" <${fromAddr}>`,
      replyTo: `"${name}" <${email}>`,
      to: notifyTo,
      subject: `[8os] ${subject} — ${name}`,
      text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#0d0d0f;color:#ededed;padding:2rem;">
  <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:2rem;">
    <h2 style="margin:0 0 1.5rem;font-size:1.125rem;font-weight:600;">New contact form submission</h2>
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
      <tr><td style="padding:0.375rem 0;color:#888;width:80px;">From</td><td style="padding:0.375rem 0;"><strong>${name}</strong> &lt;${email}&gt;</td></tr>
      <tr><td style="padding:0.375rem 0;color:#888;">Subject</td><td style="padding:0.375rem 0;">${subject}</td></tr>
    </table>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:1.25rem 0;">
    <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  </div>
</body>
</html>`,
    })
  } catch (err) {
    console.error('[contact] Failed to send email:', err)
    return NextResponse.json(
      { error: 'Failed to send your message. Please try again or email us directly.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    message: "Thanks! We'll be in touch within 1 business day.",
  })
}
