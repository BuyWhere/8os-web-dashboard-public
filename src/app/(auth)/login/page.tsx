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
const BG = "#F7F3EC"   // cream — matches :root --color-bg-primary
const CARD = "#FFFFFF"  // white card surface — matches --color-bg-card
const INK = "#221F1A"   // ink — matches --color-text-primary
const MUTED = "#6B6257" // warm gray — matches --color-text-secondary
const GOLD = "#B08637"  // 8os gold accent — 4.69:1 on cream
const BORDER = "#E7DFD2" // hairline

export default function LoginPage() {
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
      <LoginClerkErrorBridge
        signUpUrl="/signup"
        forceRedirectUrl="/dashboard"
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
