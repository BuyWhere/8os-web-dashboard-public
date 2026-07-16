import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

// Clerk components read request context; render at request time (never prerender).
export const dynamic = "force-dynamic"

// Real front door: Clerk-hosted <SignUp> at /signup on 8os.ai, wrapped in an
// 8os-branded two-column shell (value prop + benefits beside the form) so it
// feels like part of the product, not a detached vendor widget. Larger controls
// (≥44px). Hash routing keeps verification on /signup; new users → /onboarding.
const BG = "#F7F3EC"    // cream, --color-bg-primary
const CARD = "#FFFFFF"  // white card, --color-bg-card
const INK = "#221F1A"   // ink, --color-text-primary
const MUTED = "#221F1A" // ink body text for VidMee/WCAG-strong signup copy
const LINK_DARK = "#000000" // black for WCAG-strong Clerk controls on gold/white
const GOLD = "#B08637"  // 8os gold accent
const BORDER = "#767676" // dark gray for WCAG input borders (was #E7DFD2, 1.46:1 fails)

const BENEFITS = [
  { icon: "◐", title: "Your real BaZi archetype", body: "Not a horoscope, a decoded operating profile from your birth chart." },
  { icon: "◇", title: "Operated daily", body: "Goals, calendar, and a coach that knows when to push and when to rest." },
  { icon: "✦", title: "Right goal, right season", body: "Your dashboard aligns effort to the season you're actually in." },
]

export default function SignupPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, color: INK }}>
      <div className="signup-grid" style={{ maxWidth: 1080, margin: "0 auto", minHeight: "100vh", display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", gap: "3rem", padding: "2rem 1.5rem" }}>
        {/* Left, product context */}
        <section className="signup-pitch" style={{ maxWidth: 460 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: "1.75rem" }} aria-label="8os home">
            <svg width={28} height={28} viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="10.5" r="6" stroke={GOLD} strokeWidth="2" />
              <circle cx="16" cy="21.5" r="6.5" stroke={INK} strokeWidth="2" />
            </svg>
            <span style={{ fontFamily: "var(--font-serif-header), Georgia, serif", fontSize: "1.35rem", fontWeight: 600, color: INK }}>8os</span>
          </Link>
          <h1 style={{ fontFamily: "var(--font-serif-header), Georgia, serif", fontSize: "2rem", lineHeight: 1.15, fontWeight: 600, margin: "0 0 0.75rem" }}>
            Build your personalized Life OS
          </h1>
          <p style={{ color: MUTED, fontSize: "1.05rem", lineHeight: 1.5, margin: "0 0 1.75rem" }}>
            The planner that runs on your real BaZi archetype, free, no credit card.
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1.1rem" }}>
            {BENEFITS.map((b) => (
              <li key={b.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden style={{ color: GOLD, fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>{b.icon}</span>
                <span>
                  <span style={{ display: "block", fontWeight: 600, fontSize: "0.98rem" }}>{b.title}</span>
                  <span style={{ display: "block", color: MUTED, fontSize: "0.9rem", lineHeight: 1.45 }}>{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Right, the Clerk form */}
        <section className="signup-auth" style={{ display: "flex", justifyContent: "center" }}>
          <SignUp
            routing="hash"
            signInUrl="/login"
            forceRedirectUrl="/onboarding"
            appearance={{
              variables: {
                colorBackground: CARD,
                colorForeground: INK,
                colorText: INK,
                colorTextSecondary: MUTED,
                colorPrimary: GOLD,
                colorPrimaryForeground: LINK_DARK, // dark text on gold for WCAG AA 7.25:1 (was #FFFFFF, 2.49:1)
                colorNeutral: BORDER,
                colorInput: CARD,
                colorInputForeground: INK,
                borderRadius: "12px",
                fontSize: "15px",
              },
              elements: {
                rootBox: { border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(34,31,26,0.06)" },
                card: { border: "none", boxShadow: "none", borderRadius: 0 },
                formButtonPrimary: { minHeight: "44px", fontSize: "15px", color: LINK_DARK },
                socialButtonsBlockButton: { minHeight: "44px", border: `1px solid ${BORDER}`, borderRadius: "8px" }, // dark border for WCAG social button contrast
                formFieldInput: { minHeight: "44px", border: `1px solid ${BORDER}`, boxShadow: `0 0 0 1px ${BORDER}` },
                formFieldLabel: { color: LINK_DARK }, // dark label for WCAG AA 12.4:1 on white
                formFieldLabelRow: { color: LINK_DARK },
                formFieldHintText: { color: LINK_DARK },
                formFieldOptionalText: { color: LINK_DARK }, // dark "Optional" label for WCAG AA 12.4:1
                footerActionLink: { color: LINK_DARK, fontWeight: 600 }, // dark "Sign in" link for WCAG AA 12.4:1
              },
            }}
          />
        </section>
      </div>
      {/* Mobile: single column, hide the pitch to keep the form above the fold. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .signup-auth .cl-formFieldInput { border-color: ${BORDER} !important; box-shadow: 0 0 0 1px ${BORDER} !important; }
        .signup-auth .cl-formFieldOptionalText { color: ${LINK_DARK} !important; }
        .signup-auth .cl-socialButtonsBlockButton { border-color: ${BORDER} !important; border: 1px solid ${BORDER} !important; }
        .signup-auth .cl-formFieldHintText,
        .signup-auth .cl-footerActionLink,
        .signup-auth .cl-formButtonPrimary { color: ${LINK_DARK} !important; }
        @media (max-width: 860px) {
          .signup-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; padding-top: 2.5rem !important; }
          .signup-pitch { max-width: 100% !important; text-align: center; }
          .signup-pitch ul { text-align: left; max-width: 360px; margin: 0 auto !important; }
        }
      ` }} />
    </main>
  )
}