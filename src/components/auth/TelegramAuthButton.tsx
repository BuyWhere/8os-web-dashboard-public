'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface Props {
  /** 'login' creates a session; 'link' attaches Telegram to the current account */
  mode?: 'login' | 'link'
  /** Where to redirect after successful login (ignored for link mode) */
  next?: string
  /** Called after a successful link (link mode only) */
  onLinked?: () => void
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void
  }
}

export function TelegramAuthButton({ mode = 'login', next = '/dashboard', onLinked }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
    if (!botUsername) {
      console.warn('NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set, Telegram button disabled')
      return
    }

    // Define global callback that the Telegram widget invokes
    window.onTelegramAuth = async (user: TelegramUser) => {
      setLoading(true)
      setError('')
      try {
        const body: Record<string, string> = {
          id: String(user.id),
          auth_date: String(user.auth_date),
          hash: user.hash,
        }
        if (user.first_name) body.first_name = user.first_name
        if (user.last_name) body.last_name = user.last_name
        if (user.username) body.username = user.username
        if (user.photo_url) body.photo_url = user.photo_url
        if (mode === 'link') body._mode = 'link'

        const res = await fetch('/api/auth/telegram/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = (await res.json()) as { ok?: boolean; redirectTo?: string; error?: string }

        if (!res.ok) {
          setError(data.error ?? 'Telegram sign-in failed')
          return
        }

        if (mode === 'link') {
          onLinked?.()
        } else {
          router.push(data.redirectTo ?? next)
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    // Inject the Telegram widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    containerRef.current?.appendChild(script)

    return () => {
      // Cleanup on unmount
      delete window.onTelegramAuth
      containerRef.current?.removeChild(script)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (!process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) {
    return null
  }

  return (
    <div>
      {error && <div style={styles.errorBox}>{error}</div>}
      <div
        ref={containerRef}
        style={{
          ...styles.wrapper,
          opacity: loading ? 0.5 : 1,
          pointerEvents: loading ? 'none' : 'auto',
        }}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    transition: 'opacity 0.15s ease',
  },
  errorBox: {
    background: '#1a0808',
    border: '1px solid #5c1818',
    color: '#ff6b6b',
    borderRadius: '8px',
    padding: '0.625rem 0.875rem',
    fontSize: '0.8rem',
    marginBottom: '0.5rem',
  },
}
