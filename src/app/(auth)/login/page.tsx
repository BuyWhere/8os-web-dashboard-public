import { LoginClerkErrorBridge } from "@/components/auth/LoginClerkErrorBridge"

// Clerk components read request context; render at request time (never prerender).
export const dynamic = "force-dynamic"

// Real front door: Clerk-hosted <SignIn>, rendered at /login on 8os.ai.
// Hash routing keeps every step (password, factor-two, forgot-password reset)
// on this same /login path, so no catch-all route or middleware change is
// needed and there is no bounce loop. Forgot-password is Clerk's built-in flow.
//
// Theme: warm editorial — cream wrapper matching 8os marketing pages, with a
// raised card surface. Dark ink text on cream; gold CTA on white card.
// (Dark-theme auth was tried but near-black text-on-card collapsed visually
// at 99.9% dark pixels per QA pixel analysis; light warm wins.)
const BG = "#F7F3EC"   // cream, matches :root --color-bg-primary
const CARD = "#FFFFFF"  // white card surface, matches --color-bg-card
const INK = "#221F1A"   // ink, matches --color-text-primary
const MUTED = "#6B6257"    // muted body/hint text (5.47:1 on cream)
const LINK_DARK = "#221F1A" // dark ink for WCAG-strong elements (links, labels)
// OS-5953: Continue uses white text. Brand gold #B08637 is only 3.33:1 with
// white. OS-5929 darkened to #8A6728 (5.18:1 AA) but QA 2026-09-03 still
// measured ~4.8:1 near the AA threshold — risky under sRGB/gamma variance.
// Drop to #755521 (6.82:1) per QA's explicit suggestion: comfortably above the
// >5.5:1 target they specified. Social labels stay black (21:1 on white).
const GOLD = "#755521"
const CTA_FG = "#FFFFFF"
const SOCIAL_FG = "#000000" // 21:1 on white — beats Clerk's muted provider colors
const BORDER = "#767676" // dark gray for WCAG input borders (was #E7DFD2, 1.46:1 fails)

export default function LoginPage() {
  return (
    <>
      {/* OS-6399: set body class immediately on page load, before React hydrates.
          This ensures the header override CSS applies on first paint (no flash).
          The :has() selector needs the class on body, not just on <main>. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              document.body.classList.add('login-auth');
            })();
          `,
        }}
      />
      <main
        className="login-auth"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1rem",
          background: BG,
        }}
      >
        <LoginClerkErrorBridge
          signUpUrl="/signup"
          forceRedirectUrl="/dashboard"
          appearance={{
            layout: {
              socialButtonsVariant: "blockButton",
            },
            variables: {
              // Card / page surface
              colorBackground: CARD,
              colorForeground: INK,
              colorText: INK,
              colorTextSecondary: MUTED,
              // Brand
              colorPrimary: GOLD,
              colorPrimaryForeground: CTA_FG, // OS-5953: white on #755521 = 6.82:1 AA
              // Borders & dividers
              colorNeutral: BORDER,
              // Inputs: light surface, dark text
              colorInput: CARD,
              colorInputForeground: INK,
              // Border radius to match 8os cards
              borderRadius: "12px",
            },
            elements: {
              card: {
                border: `1px solid ${BORDER}`,
                boxShadow: "0 4px 24px rgba(34,31,26,0.06)",
              },
              formFieldLabel: { color: LINK_DARK }, // dark label for WCAG AA 12.4:1 on white
              footerActionLink: { color: LINK_DARK, fontWeight: 600 }, // dark "Sign up" link for WCAG AA 12.4:1
              formButtonPrimary: { color: CTA_FG, background: GOLD, backgroundColor: GOLD },
              socialButtonsBlockButton: { color: SOCIAL_FG, border: `1px solid ${BORDER}` },
              socialButtonsBlockButtonText: { color: SOCIAL_FG },
            },
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          /* OS-6399: override marketing header on login to match the warm cream canvas.
             The header's dark background (rgba(13,13,15,0.92)) creates a visual disconnect
             on the light login page (cream #F7F3EC). This override uses :has() to target
             the header when login-auth class is present on body. */
          body.login-auth header.marketing-header {
            background: rgba(247, 243, 236, 0.85) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border-bottom-color: var(--color-border) !important;
          }
          body.login-auth header.marketing-header * {
            color: var(--color-text-primary) !important;
          }
          /* Dark mode override for login header */
          body.login-auth[data-theme="dark"] header.marketing-header {
            background: rgba(26, 23, 18, 0.85) !important;
          }
          /* OS-5957 / OS-5953 / OS-5929: force white on #755521 including descendants;
             social labels black including provider-suffixed classes axe targets. */
          .login-auth .cl-formButtonPrimary,
          .login-auth .cl-formButtonPrimary *,
          .login-auth button[type="submit"] {
            color: ${CTA_FG} !important;
            background: ${GOLD} !important;
            background-color: ${GOLD} !important;
          }
          /* OS-5811: hide Clerk's built-in arrow span; JS injects an aria-hidden SVG. */
          .login-auth .cl-formButtonPrimary .cl-buttonArrowIcon,
          .login-auth .cl-formButtonPrimary [class*="buttonArrow"],
          .login-auth button[type="submit"] .cl-buttonArrowIcon {
            display: none !important;
          }
          .login-auth .cl-formButtonPrimary svg[data-os-continue-arrow] {
            display: inline-block !important;
            margin-left: 0.4em;
            vertical-align: -0.1em;
            color: inherit !important;
            background: transparent !important;
          }
          .login-auth .cl-socialButtonsBlockButton,
          .login-auth .cl-socialButtonsBlockButton * { color: ${SOCIAL_FG} !important; }
          .login-auth .cl-socialButtonsBlockButtonText,
          .login-auth .cl-socialButtonsBlockButtonText__apple,
          .login-auth .cl-socialButtonsBlockButtonText__github,
          .login-auth .cl-socialButtonsBlockButtonText__google { color: ${SOCIAL_FG} !important; }
          /* OS-5570: Clerk parks the password row as position:absolute;height:0;opacity:0
             on the identifier step, but overflow:visible lets the input paint at the
             same Y as Email. Hide it completely until the password step is active. */
          .login-auth .cl-signIn-start .cl-formFieldRow__password {
            position: absolute !important;
            left: -9999px !important;
            top: auto !important;
            width: 1px !important;
            height: 1px !important;
            min-height: 0 !important;
            overflow: hidden !important;
            clip: rect(0 0 0 0) !important;
            clip-path: inset(50%) !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
          .login-auth .cl-signIn-password .cl-formFieldRow__password,
          .login-auth .cl-signIn-password .cl-formFieldRow__identifier {
            position: static !important;
            left: auto !important;
            width: auto !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            clip: auto !important;
            clip-path: none !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
          }
          .login-auth .cl-form {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
        ` }} />
      </main>
    </>
  )
}
