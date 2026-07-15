import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
<<<<<<< HEAD
=======
import { Inter } from 'next/font/google'
>>>>>>> forge/main
import { Suspense } from 'react'

// Inter is the single typeface for the whole site (body + headings + wordmark).
// Exposed globally as --font-sans on <html>; globals.css body reads it.
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' })
// PostHogProvider moved to (dashboard)/layout.tsx — keeps PostHog SDK (~188 KiB)
// off public marketing pages to improve Lighthouse perf on /, /features, etc.
import { MetaPixel } from '@/components/MetaPixel'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ThemeProvider } from '@/components/ThemeProvider'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import './globals.css'

export const metadata: Metadata = {
  title: '8os - Your Personalized Life Operating System',
  description: 'A personalized operating system unique to you. Free. No credit card. Works in your browser.',
  keywords: ['personalized OS', 'productivity', 'life operating system', 'AI productivity', 'operating system for life'],
  authors: [{ name: '8os' }],
  creator: '8os',
  metadataBase: new URL('https://8os.ai'),
  alternates: {
    canonical: '/',
    // Note: i18n routes (/en, /zh) removed from hreflang on 2026-06-15.
    // The 8os.ai launch is English-only. We do not advertise non-existent
    // language alternates to Google. To re-enable when real translations ship,
    // add the routes back and restore the languages map.
  },
  openGraph: {
    type: 'website',
    url: 'https://8os.ai/',
    siteName: '8os',
    title: '8os - Your Personalized Life Operating System',
    description: 'A personalized operating system unique to you. Free. No credit card. Works in your browser.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '8os - Your Personalized Life Operating System',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: '8os - Your Personalized Life Operating System',
    description: 'A personalized operating system unique to you. Free. No credit card. Works in your browser.',
    images: ['/og-image.png'],
    creator: '@8os',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  }),
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '8os',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web, Telegram',
  description: 'A personalized operating system for life that combines BaZi and AI to create a productivity system tailored to your personality.',
  url: 'https://8os.ai',
  image: 'https://8os.ai/og-image.png',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '1523',
  },
  brand: {
    '@type': 'Brand',
    name: '8os',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? '/login'}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? '/signup'}
      signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? '/dashboard'}
      signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? '/onboarding'}
    >
<<<<<<< HEAD
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
          />
        </head>
        <body suppressHydrationWarning>
          {/* Meta Pixel — fires PageView on every route change. Bails out when
=======
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* No-flash theme boot, sets <html data-theme> synchronously from the
            persisted choice + OS preference, BEFORE first paint. Must run
            before any styled content renders. See src/lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body>
        {/* ThemeProvider wraps all chrome (Header/Footer) + content so the
            whole tree can read/toggle the light/dark theme via useTheme(). */}
        <ThemeProvider>
          {/* Meta Pixel, fires PageView on every route change. Bails out when
>>>>>>> forge/main
              NEXT_PUBLIC_META_PIXEL_ID is unset (local dev, pre-pixel deploys).
              See src/components/MetaPixel.tsx. */}
          <MetaPixel />
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Header />
          <div id="main-content" tabIndex={-1}>
<<<<<<< HEAD
            <PostHogProvider>
              {children}
            </PostHogProvider>
          </div>
          <Footer />
        </body>
      </html>
=======
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
>>>>>>> forge/main
    </ClerkProvider>
  )
}
