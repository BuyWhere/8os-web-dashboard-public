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
// OS-5929: Continue uses white text. Brand gold #B08637 is only 3.33:1 with
// white, so darken the CTA fill to #8A6728 (5.18:1). Social labels use black.
const GOLD = "#8A6728"
const CTA_FG = "#FFFFFF"
const SOCIAL_FG = "#000000" // 21:1 on white — beats Clerk's muted provider colors
const BORDER = "#767676" // dark gray for WCAG input borders (was #E7DFD2, 1.46:1 fails)

export default function LoginPage() {
  return (
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
            colorPrimaryForeground: CTA_FG, // OS-5929: white on #8A6728 = 5.18:1 AA
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
        /* OS-5957 / OS-5929: force white on #8A6728 including descendants;
           social labels black including provider-suffixed classes axe targets. */
        .login-auth .cl-formButtonPrimary,
        .login-auth .cl-formButtonPrimary *,
        .login-auth button[type="submit"] {
          color: ${CTA_FG} !important;
          background: ${GOLD} !important;
          background-color: ${GOLD} !important;
        }
        .login-auth .cl-socialButtonsBlockButton,
        .login-auth .cl-socialButtonsBlockButton * { color: ${SOCIAL_FG} !important; }
        .login-auth .cl-socialButtonsBlockButtonText,
        .login-auth .cl-socialButtonsBlockButtonText__apple,
        .login-auth .cl-socialButtonsBlockButtonText__github,
        .login-auth .cl-socialButtonsBlockButtonText__google { color: ${SOCIAL_FG} !important; }
      ` }} />
    </main>
  )
}
