import { SignUp } from "@clerk/nextjs"

// Clerk components read request context; render at request time (never prerender).
export const dynamic = "force-dynamic"

// Real front door: Clerk-hosted <SignUp>, rendered at /signup on 8os.ai.
// Hash routing keeps email-verification and every step on /signup. A brand-new
// user is sent to /onboarding after sign-up (forceRedirectUrl). Clerk handles
// SSO (Google etc.) natively, so the legacy Google button is gone.
export default function SignupPage() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "1rem",
        background: "#0a0a0a",
      }}
    >
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/onboarding"
        appearance={{
          variables: {
            colorBackground: "#111111",
            colorText: "#ededed",
            colorPrimary: "#ededed",
            colorInputBackground: "#0a0a0a",
            colorInputText: "#ededed",
            borderRadius: "12px",
          },
        }}
      />
    </main>
  )
}
