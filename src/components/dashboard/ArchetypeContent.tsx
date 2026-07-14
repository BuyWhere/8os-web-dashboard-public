'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ARCHETYPES } from '@/lib/archetype'
import { DashboardPageStyles, ErrorCard, LoadingMessage, SectionCard, SkeletonBlock } from './page-state'
import { useArchetypeTheme } from '@/components/archetype'

interface ArchetypeResponse {
  archetypeId: string
  archetypeName: string
  confidence: number
  dominantElements: string[]
  personalityVector: Record<string, number> | null
  isHybrid: boolean
}

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ArchetypeResponse }

export function ArchetypeSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <LoadingMessage>Loading your archetype profile...</LoadingMessage>

      <SectionCard accent="var(--skin-color-border)" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <SkeletonBlock width={72} height={72} radius={20} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={110} height={12} style={{ marginBottom: 10 }} />
            <SkeletonBlock width="42%" height={26} style={{ marginBottom: 10 }} />
            <SkeletonBlock width="58%" height={14} style={{ marginBottom: 12 }} />
            <SkeletonBlock width="78%" height={14} style={{ marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <SkeletonBlock width={110} height={24} radius={999} />
              <SkeletonBlock width={92} height={24} radius={999} />
              <SkeletonBlock width={98} height={24} radius={999} />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SkeletonBlock width={140} height={18} style={{ marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ background: 'var(--color-bg-primary)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <SkeletonBlock width={84} height={12} />
                <SkeletonBlock width={72} height={12} />
              </div>
              <SkeletonBlock width="100%" height={6} radius={999} />
              <SkeletonBlock width={36} height={10} style={{ marginTop: 8, marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function ArchetypeContent() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [requestKey, setRequestKey] = useState(0)
  const { setArchetypeId: setSkinArchetypeId } = useArchetypeTheme()

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setState({ status: 'loading' })

      try {
        const response = await fetch('/api/onboarding/archetype', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (response.status === 404) {
          setState({ status: 'empty' })
          return
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          setState({
            status: 'error',
            message: payload?.error ?? 'We could not load your archetype right now.',
          })
          return
        }

        const data = (await response.json()) as ArchetypeResponse
        setState({ status: 'ready', data })

        // Sync the skin theme provider
        if (data.archetypeId) {
          setSkinArchetypeId(data.archetypeId)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Network request failed.',
        })
      }
    }

    void load()
    return () => controller.abort()
  }, [requestKey, setSkinArchetypeId])

  if (state.status === 'loading') {
    return (
      <>
        <DashboardPageStyles />
        <ArchetypeSkeleton />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <DashboardPageStyles />
        <ErrorCard
          title="Could not load your archetype"
          message={state.message}
          actionLabel="Try again"
          onAction={() => setRequestKey((value) => value + 1)}
        />
      </>
    )
  }

  if (state.status === 'empty') {
    return (
      <>
        <DashboardPageStyles />
        <SectionCard style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌀</div>
          <div style={{ color: 'var(--skin-color-text-secondary)', marginBottom: 8, fontSize: 15 }}>Your archetype hasn&apos;t been calculated yet.</div>
          <div style={{ color: 'var(--skin-color-text-muted)', fontSize: 13, marginBottom: 20 }}>
            Complete the onboarding quiz to discover your personal operating style.
          </div>
          <Link
            href="/onboarding"
            style={{
              background: 'var(--skin-button-primary-bg)',
              color: 'var(--skin-button-primary-text)',
              padding: '10px 20px',
              borderRadius: 'var(--skin-radius-button)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Start onboarding →
          </Link>
        </SectionCard>
      </>
    )
  }

  const { data } = state
  const archetypeDef = ARCHETYPES.find((item) => item.id === data.archetypeId)
  const personalityVector = data.personalityVector

  return (
    <>
      <DashboardPageStyles />
      <div style={{ display: 'grid', gap: 20 }}>
        <div
          style={{
            background: 'var(--skin-gradient-card)',
            border: '1px solid var(--skin-color-border)',
            borderRadius: 'var(--skin-radius-card)',
            padding: '28px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div style={{ fontSize: 64, filter: 'drop-shadow(0 0 8px var(--skin-glow-primary))' }}>{archetypeDef?.icon ?? '✨'}</div>
          <div>
            <div style={{ color: 'var(--skin-color-primary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Your Archetype
            </div>
            <div style={{ fontWeight: 'var(--skin-typo-heading-weight)', fontSize: 24, marginBottom: 4 }}>{data.archetypeName}</div>
            <div style={{ color: 'var(--skin-color-text-secondary)', fontSize: 14, fontStyle: 'italic', marginBottom: 10 }}>
              &ldquo;{archetypeDef?.tagline}&rdquo;
            </div>
            <div style={{ color: 'var(--skin-color-text-muted)', fontSize: 13, maxWidth: 500 }}>{archetypeDef?.description}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--skin-color-badge-bg)', color: 'var(--skin-color-badge-text)', padding: '3px 10px', borderRadius: 5, fontSize: 11 }}>
                Confidence {Math.round(data.confidence * 100)}%
              </span>
              {data.dominantElements.map((element) => (
                <span key={element} style={{ background: 'var(--skin-color-badge-bg)', color: 'var(--skin-color-badge-text)', padding: '3px 10px', borderRadius: 5, fontSize: 11 }}>
                  {element} dominant
                </span>
              ))}
              {data.isHybrid && (
                <span style={{ background: 'var(--skin-color-badge-bg)', color: 'var(--skin-color-accent)', padding: '3px 10px', borderRadius: 5, fontSize: 11 }}>
                  Hybrid
                </span>
              )}
            </div>
          </div>
        </div>

        {personalityVector && (
          <SectionCard>
            <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 'var(--skin-typo-heading-weight)' }}>Personality Profile</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {[
                { key: 'systematic', label: 'Systematic', opposite: 'Intuitive', value: personalityVector.systematic ?? 0.5 },
                { key: 'goalDriven', label: 'Goal-Driven', opposite: 'Process-Driven', value: personalityVector.goalDriven ?? 0.5 },
                { key: 'futureFocused', label: 'Future-Focused', opposite: 'Present-Focused', value: personalityVector.futureFocused ?? 0.5 },
              ].map(({ key, label, opposite, value }) => (
                <div key={key} style={{ background: 'var(--color-bg-primary)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--skin-color-text-muted)' }}>{opposite}</span>
                    <span style={{ fontSize: 12, color: 'var(--skin-color-text-muted)' }}>{label}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${value * 100}%`, background: 'var(--skin-color-primary)', borderRadius: 3 }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--skin-color-text-muted)', marginTop: 4 }}>
                    {Math.round(value * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/dashboard/archetype/compare"
            style={{
              background: 'var(--skin-button-secondary-bg)',
              color: 'var(--skin-button-secondary-text)',
              padding: '10px 18px',
              borderRadius: 'var(--skin-radius-button)',
              textDecoration: 'none',
              fontSize: 13,
              border: '1px solid var(--skin-button-secondary-border)',
            }}
          >
            Compare archetypes →
          </Link>
          <Link
            href="/onboarding/quiz"
            style={{
              background: 'var(--skin-button-secondary-bg)',
              color: 'var(--skin-button-secondary-text)',
              padding: '10px 18px',
              borderRadius: 'var(--skin-radius-button)',
              textDecoration: 'none',
              fontSize: 13,
              border: '1px solid var(--skin-button-secondary-border)',
            }}
          >
            Retake quiz →
          </Link>
        </div>
      </div>
    </>
  )
}
