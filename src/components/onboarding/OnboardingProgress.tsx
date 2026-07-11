'use client'

/**
 * OnboardingProgress — shared warm-editorial step indicator for the whole
 * onboarding journey (birth → quiz → archetype → goals → define → projects →
 * tasks). Gives users a consistent "Step N of 7" anchor plus a progress bar so
 * they always know where they are and how much is left.
 *
 * Pure presentation — no logic, no persistence. Pass the current step key.
 */

export type OnboardingStepKey =
  | 'birth'
  | 'quiz'
  | 'archetype'
  | 'goals'
  | 'define'
  | 'projects'
  | 'tasks'

const STEPS: { key: OnboardingStepKey; label: string }[] = [
  { key: 'birth', label: 'Birth' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'archetype', label: 'Archetype' },
  { key: 'goals', label: 'Goals' },
  { key: 'define', label: 'Define' },
  { key: 'projects', label: 'Projects' },
  { key: 'tasks', label: 'Tasks' },
]

const GOLD = '#B08637'
const INK = '#221F1A'
const WARM_GRAY = '#6B6257'
const MUTED = '#8A8175'
const HAIRLINE = '#E7DFD2'
const TRACK = '#EAE1D2'

export function OnboardingProgress({
  current,
  note,
}: {
  current: OnboardingStepKey
  /** Optional right-aligned status note, e.g. "Saving…". */
  note?: string
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)
  const total = STEPS.length
  const stepNumber = currentIndex + 1
  // Fill through the middle of the current step so early steps don't read empty.
  const fillPct = ((currentIndex + 0.5) / total) * 100

  return (
    <div
      style={{
        maxWidth: 680,
        width: '100%',
        margin: '0 auto',
        marginBottom: '2.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.6rem',
          gap: '1rem',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: GOLD,
          }}
        >
          Step {stepNumber} of {total}
          <span style={{ color: MUTED, fontWeight: 600 }}>
            {' '}· {STEPS[currentIndex]?.label}
          </span>
        </div>
        {note ? (
          <div style={{ fontSize: '0.72rem', color: MUTED, fontWeight: 500 }}>{note}</div>
        ) : (
          <div style={{ fontSize: '0.72rem', color: MUTED, fontWeight: 500 }}>
            {total - stepNumber === 0
              ? 'Last step'
              : `${total - stepNumber} step${total - stepNumber > 1 ? 's' : ''} left`}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          width: '100%',
          background: TRACK,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${fillPct}%`,
            background: GOLD,
            borderRadius: 999,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Step ticks — hidden on narrow screens to avoid crowding */}
      <div
        className="onb-progress-ticks"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.55rem',
        }}
      >
        {STEPS.map((s, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <div
              key={s.key}
              style={{
                fontSize: '0.66rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
                color: active ? INK : done ? WARM_GRAY : MUTED,
                opacity: done || active ? 1 : 0.7,
              }}
            >
              {s.label}
            </div>
          )
        })}
      </div>

      <style>{`@media (max-width: 560px){ .onb-progress-ticks{ display:none !important; } }`}</style>
    </div>
  )
}
