import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Privacy Policy, 8os',
  description: 'How 8os collects, uses, and protects your personal information.',
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children
}
