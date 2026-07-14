import { SignIn } from "@clerk/nextjs"

// Clerk components read request context; render at request time (never prerender).
export const dynamic = "force-dynamic"

// Real front door: Clerk-hosted <SignIn>, rendered at /login on 8os.ai.
// Hash routing keeps every step (password, factor-two, forgot-password reset)
// on this same /login path, so no catch-all route or middleware change is
// needed and there is no bounce loop. Forgot-password is Clerk's built-in flow.
export default function LoginPage() {
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
      <SignIn
        routing="hash"
        signUpUrl="/signup"
        forceRedirectUrl="/dashboard"
        appearance={{
          variables: {
            colorBackground: "#111111",
            colorText: "var(--color-border)",
            colorPrimary: "var(--color-border)",
            colorInputBackground: "#0a0a0a",
            colorInputText: "var(--color-border)",
            borderRadius: "12px",
          },
        }}
      />
    </main>
  )
}
