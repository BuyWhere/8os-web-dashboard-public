import { SignupClerkErrorBridge } from "@/components/auth/SignupClerkErrorBridge"
import { SignupPlanIntent } from "@/components/auth/SignupPlanIntent"

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
const GOLD = "#8A6728"  // darkened gold: white text 5.18:1 (brand #B08637 is 3.33:1 with white)
const CTA_FG = "#FFFFFF"
const SOCIAL_FG = "#000000" // 21:1 on white — beats Clerk provider brand greys
const BORDER = "#4A4A4A" // dark gray for WCAG input borders — 7.1:1 on white (was #767676 4.5:1, Clerk shorthand overrides border-color longhand)

const BENEFITS = [
  { icon: "◐", title: "Your real BaZi archetype", body: "Not a horoscope, a decoded operating profile from your birth chart." },
  { icon: "◇", title: "Operated daily", body: "Goals, calendar, and a coach that knows when to push and when to rest." },
  { icon: "✦", title: "Right goal, right season", body: "Your dashboard aligns effort to the season you're actually in." },
]

export default function SignupPage() {
  return (
    <main style={{ minHeight: "100vh", background: BG, color: INK, overflowX: "clip", maxWidth: "100%" }}>
      {/* OS-3873 / OS-4745: the 1440px desktop shell needs to use the available
          viewport instead of reading like a narrow ~900px card pinned left. Keep
          a 32px gutter, widen to 1360px, and right-align the auth card so the
          form uses the right side of the desktop canvas while the header actions
          also sit near the viewport edge. */}
      {/* OS-5655: 4rem (64px) gap left a visual disconnect between pitch and
          Clerk card. gap-12 (3rem) + items-center keeps a tight two-column hero. */}
      {/* OS-5893: minmax(400px, 520px) on the auth column beat the 860px 1fr
          media override (inline style wins), so 375px viewports overflowed ~9px.
          minmax(0, 520px) still prefers ~520px on desktop and can shrink on mobile. */}
      <div className="signup-grid" style={{ maxWidth: 1360, width: "100%", boxSizing: "border-box", margin: "0 auto", minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 520px)", alignItems: "center", gap: "3rem", padding: "6rem 2rem 2rem" }}>
        {/* Left, product context. The 8os wordmark lives in the global Header, so
            we don't repeat it here — it would compete with the header and split
            attention across two brand marks on the same page. */}
        <section className="signup-pitch" style={{ maxWidth: 460 }}>
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

        {/* Right, the Clerk form — alignSelf centers it within its row so the
            card floats between the hero copy top and the benefits list bottom.
            OS-4316: wrapped in SignupClerkErrorBridge to catch Clerk 4xx/5xx
            errors (email already exists, rate limit, server errors) and show
            a clear inline message instead of a silent broken form. */}
        <section className="signup-auth" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", alignSelf: "center", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
          <SignupPlanIntent />
          <SignupClerkErrorBridge
            signInUrl="/login"
            forceRedirectUrl="/onboarding"
            appearance={{
              layout: {
                socialButtonsVariant: "blockButton",
              },
              variables: {
                colorBackground: CARD,
                colorForeground: INK,
                colorText: INK,
                colorTextSecondary: MUTED,
                colorPrimary: GOLD,
                colorPrimaryForeground: CTA_FG, // OS-5957: white on #8A6728 = 5.18:1 AA
                colorNeutral: BORDER,
                colorInput: CARD,
                colorInputForeground: INK,
                borderRadius: "12px",
                fontSize: "15px",
              },
              elements: {
                rootBox: { border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden", boxShadow: "0 4px 24px rgba(34,31,26,0.06)" },
                card: { border: "none", boxShadow: "none", borderRadius: 0, padding: "0 24px" }, // OS-3873 r5: 24px horizontal padding so inputs/social buttons don't clip at card edges
                header: { display: "none" }, // Hide Clerk's default logo/header branding
                formButtonPrimary: { minHeight: "44px", fontSize: "15px", color: CTA_FG, background: GOLD, backgroundColor: GOLD },
                socialButtonsBlockButton: { minHeight: "44px", border: `1px solid ${BORDER}`, borderRadius: "8px", color: SOCIAL_FG },
                socialButtonsBlockButtonText: { color: SOCIAL_FG },
                formFieldInput: { minHeight: "44px", border: `1px solid ${BORDER}`, boxShadow: `0 0 0 1px ${BORDER}` },
                formFieldLabel: { color: LINK_DARK }, // dark label for WCAG AA 12.4:1 on white
                formFieldLabelRow: { color: LINK_DARK },
                formFieldHintText: { color: LINK_DARK },
                formFieldOptionalText: { color: LINK_DARK }, // dark "Optional" label for WCAG AA 12.4:1
                footerActionLink: { color: LINK_DARK, fontWeight: 600 }, // dark "Sign in" link for WCAG AA 12.4:1
              },
            }}
          />
          {/* OS-4316: Terms + Privacy links below the Clerk card for transparency.
              Clerk may render its own terms acceptance inside the widget depending
              on Dashboard settings; these links are always visible regardless. */}
          <p style={{ marginTop: 12, fontSize: "0.85rem", color: "#4A4A4A", textAlign: "center", lineHeight: 1.4 }}>
            By creating an account you agree to our{" "}
            <a href="/terms" style={{ color: LINK_DARK, textDecoration: "underline" }}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" style={{ color: LINK_DARK, textDecoration: "underline" }}>Privacy Policy</a>.
          </p>
        </section>
      </div>
      {/* Mobile: single column, hide the pitch to keep the form above the fold. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .signup-auth .cl-formFieldInput { border: 1px solid ${BORDER} !important; box-shadow: 0 0 0 1px ${BORDER} !important; }
        .signup-auth .cl-formFieldOptionalText { color: ${LINK_DARK} !important; }
        .signup-auth .cl-socialButtonsBlockButton { border-color: ${BORDER} !important; border: 1px solid ${BORDER} !important; color: ${SOCIAL_FG} !important; }
        .signup-auth .cl-socialButtonsBlockButton * { color: ${SOCIAL_FG} !important; fill: ${SOCIAL_FG} !important; }
        /* OS-5957 / OS-5928 / OS-5655: Apple labels ship as Clerk --colorTextSecondary
           / muted grey and look disabled vs GitHub/Google. Force every provider
           suffix + inner span/svg to SOCIAL_FG (#000, 21:1 on white). */
        .signup-auth .cl-socialButtonsBlockButtonText,
        .signup-auth .cl-socialButtonsBlockButtonText__apple,
        .signup-auth .cl-socialButtonsBlockButtonText__github,
        .signup-auth .cl-socialButtonsBlockButtonText__google,
        .signup-auth .cl-socialButtonsProviderIcon__apple,
        .signup-auth button[data-provider="apple"],
        .signup-auth button[data-provider="apple"] * {
          color: ${SOCIAL_FG} !important;
          fill: ${SOCIAL_FG} !important;
          opacity: 1 !important;
        }
        .signup-auth > p { color: #4A4A4A !important; }
        .signup-auth .cl-formFieldHintText,
        .signup-auth .cl-footerActionLink { color: ${LINK_DARK} !important; }
        /* OS-5957: white on #8A6728 = 5.18:1. Descendants + submit beat Clerk
           inner spans and the old globals.css * { color:#000 } trap. */
        .signup-auth .cl-formButtonPrimary,
        .signup-auth .cl-formButtonPrimary *,
        .signup-auth button[type="submit"] {
          color: ${CTA_FG} !important;
          background-color: ${GOLD} !important;
          background: ${GOLD} !important;
        }
        .signup-auth, .signup-auth .cl-rootBox, .signup-auth .cl-cardBox, .signup-auth .cl-card {
          max-width: 100% !important;
          width: 100% !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        @media (max-width: 860px) {
          .signup-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 1.5rem !important; padding: 2.5rem 1rem 2rem !important; }
          .signup-pitch { max-width: 100% !important; text-align: center; }
          .signup-pitch ul { text-align: left; max-width: 360px; width: 100%; margin: 0 auto !important; }
        }
      ` }} />
    </main>
  )
}
