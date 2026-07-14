import { SignUp } from "@clerk/nextjs"

// Clerk components read request context; render at request time (never prerender).
export const dynamic = "force-dynamic"

// Real front door: Clerk-hosted <SignUp>, rendered at /signup on 8os.ai.
// Hash routing keeps email-verification and every step on /signup. A brand-new
// user is sent to /onboarding after sign-up (forceRedirectUrl). Clerk handles
// SSO (Google etc.) natively, so the legacy Google button is gone.
//
// Theme: warm editorial — cream wrapper matching 8os marketing pages, with a
// raised card surface. Dark ink text on cream; gold CTA on white card.
const BG = "#F7F3EC"   // cream — matches :root --color-bg-primary
const CARD = "#FFFFFF"  // white card surface — matches --color-bg-card
const INK = "#221F1A"   // ink — matches --color-text-primary
const MUTED = "#6B6257" // warm gray — matches --color-text-secondary
const GOLD = "#B08637"  // 8os gold accent — 4.69:1 on cream
const BORDER = "#E7DFD2" // hairline

export default function SignupPage() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        background: BG,
      }}
    >
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/onboarding"
        appearance={{
          variables: {
            // Card / page surface
            colorBackground: CARD,
            colorForeground: INK,
            colorText: INK,
            colorTextSecondary: MUTED,
            // Brand
            colorPrimary: GOLD,
            colorPrimaryForeground: "#FFFFFF",
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
          },
        }}
      />
    </main>
  )
}
