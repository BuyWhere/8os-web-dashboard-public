import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Terms of Service, 8os',
  description: 'Terms governing your use of the 8os platform.',
}

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children
}
