import { SignIn } from '@clerk/nextjs'

// Clerk components read request context; render at request time (never prerender).
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        background: '#0a0a0a',
      }}
    >
      <SignIn
        routing='hash'
        signUpUrl='/signup'
        forceRedirectUrl='/dashboard'
        appearance={{
          variables: {
            colorBackground: '#111111',
            colorText: '#ededed',
            colorPrimary: '#ededed',
            colorInputBackground: '#0a0a0a',
            colorInputText: '#ededed',
            borderRadius: '12px',
          },
        }}
      />
    </main>
  )
}
