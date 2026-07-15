'use client'

import { useRouter } from 'next/navigation'
import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs'

interface SignOutButtonProps {
  children?: React.ReactNode
  redirectUrl?: string
}

export function SignOutButton({ children, redirectUrl = '/login' }: SignOutButtonProps) {
  const router = useRouter()

  return (
    <ClerkSignOutButton signOutCallback={() => router.push(redirectUrl)}>
      <button type="button" style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
        {children ?? 'Sign out'}
      </button>
    </ClerkSignOutButton>
  )
}
