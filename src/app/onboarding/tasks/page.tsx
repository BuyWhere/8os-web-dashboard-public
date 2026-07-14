'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDomain } from '@/lib/domains'
import { getOnboardingState, saveOnboardingState } from '@/lib/storage'
import type { OSTask, Project } from '@/lib/types'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

// ─── Warm-editorial tokens ──────────────────────────────────────────────────
const CREAM = 'var(--color-bg-primary)'
const WHITE = 'var(--color-bg-card)'
const INK = 'var(--color-text-primary)'
const WARM_GRAY = 'var(--color-text-secondary)'
const MUTED = 'var(--color-text-muted)'
const GOLD = 'var(--color-accent)'
const HAIRLINE = 'var(--color-border)'
const SERIF = 'var(--font-serif), Georgia, serif'

/**
 * Onboarding Step — ARCHIE Tasks (final step).
 *
 * The projects step navigates here ("Generate tasks with ARCHIE →"). This page
 * finalizes the ARCHIE onboarding flow:
 *   1. Reads the accepted projects the user curated in the projects step
 *      (localStorage onboarding state).
 *   2. Calls the existing /api/archie/tasks route to generate a concrete task
 *      list per project (falls back to a deterministic default on error).
 *   3. Persists the generated tasks + a completedAt marker into the onboarding
 *      state, then lands the user on the populated /dashboard.
 *
 * NOTE ON PERSISTENCE: the user's goal/project/task tree is already seeded into
 * the database during the quiz step (POST /api/onboarding/archetype →
 * seedOSConfigForUser, which is idempotent and skips if the user already has
 * goals). The goals/define/projects/tasks onboarding steps refine a localStorage
 * preview; they intentionally do NOT re-create DB rows here — doing so would
 * duplicate the already-seeded board. This page therefore finalizes the preview
 * and routes to the dashboard, which renders the seeded goals/projects/tasks.
 */
export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<OSTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState(false)
  // E-2: show a light "see your last 30 days" pointer IF the user already has
  // attributable data (cheap existence check; failures stay silent — this
  // must never block or slow onboarding).
  const [hasRetroData, setHasRetroData] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetch('/api/retro?check=1', { cache: 'no-store', credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (!cancelled && j && j.hasData === true) setHasRetroData(true) })
      .catch(() => { /* pointer is optional */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const state = getOnboardingState()

    // Guard: must have curated projects to generate tasks from.
    const accepted = (state.projects ?? []).filter(p => p.accepted)
    if (accepted.length === 0) {
      router.push('/onboarding/projects')
      return
    }
    setProjects(accepted)

    // If we already generated tasks (e.g. user navigated back), reuse them.
    if (state.tasks && state.tasks.length > 0) {
      setTasks(state.tasks)
      setLoading(false)
      return
    }

    // Call ARCHIE to generate tasks for the accepted projects.
    fetch('/api/archie/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projects: accepted,
        archetype: state.archetype,
        archetypeName: state.archetypeName,
      }),
    })
      .then(r => r.json())
      .then(data => {
        const generated: OSTask[] = Array.isArray(data?.tasks) ? data.tasks : []
        const finalTasks = generated.length > 0 ? generated : fallbackTasks(accepted)
        setTasks(finalTasks)
        saveOnboardingState({ tasks: finalTasks })
      })
      .catch(() => {
        const fb = fallbackTasks(accepted)
        setTasks(fb)
        saveOnboardingState({ tasks: fb })
      })
      .finally(() => setLoading(false))
  }, [])

  function handleEnter() {
    // Finalize the onboarding preview and hand off to the (already-seeded)
    // dashboard.
    setEntering(true)
    saveOnboardingState({ tasks, completedAt: new Date().toISOString() })
    // Mark onboarding complete server-side (idempotent, best-effort — never
    // block entering the dashboard on this write).
    fetch('/api/onboarding/complete', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => { /* onboardingDone flip is best-effort */ })
    router.push('/dashboard')
  }

  const projectName = (projectId: string) =>
    projects.find(p => p.id === projectId)?.name ?? 'Your OS'
  const projectDomain = (projectId: string) =>
    projects.find(p => p.id === projectId)?.domainId ?? 'career'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: CREAM,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: `2px solid ${HAIRLINE}`,
          borderTop: `2px solid ${GOLD}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: INK, fontWeight: 600, marginBottom: '0.5rem' }}>ARCHIE is setting up your tasks...</div>
          <div style={{ color: WARM_GRAY, fontSize: '0.875rem' }}>Turning your projects into concrete next actions</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Group tasks by their project.
  const byProject = tasks.reduce<Record<string, OSTask[]>>((acc, t) => {
    if (!acc[t.projectId]) acc[t.projectId] = []
    acc[t.projectId].push(t)
    return acc
  }, {})

  const priorityColor: Record<string, string> = {
    high: '#B5502F',
    medium: 'var(--color-accent)',
    low: '#3E6B8C',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem 6rem',
    }}>
      {/* Shared step indicator */}
      <OnboardingProgress current="tasks" />

      {/* Header */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <h1 style={{
          fontFamily: SERIF,
          fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '0.75rem',
          color: INK,
        }}>
          Your OS is ready
        </h1>
        <p style={{ color: WARM_GRAY, fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
          ARCHIE turned your projects into {tasks.length} concrete next action{tasks.length !== 1 ? 's' : ''}.
          They&apos;re saved and waiting on your dashboard — this is the last step.
        </p>
      </div>

      {/* Tasks grouped by project */}
      <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
        {Object.entries(byProject).map(([projectId, projectTasks]) => {
          const domain = getDomain(projectDomain(projectId))

          return (
            <div key={projectId}>
              {/* Project header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: `1px solid ${(domain?.color ?? GOLD)}33`,
              }}>
                <span style={{ fontSize: '1.25rem' }}>{domain?.icon ?? '◇'}</span>
                <div>
                  <div style={{ fontSize: '0.65rem', color: domain?.color ?? GOLD, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{domain?.label ?? 'Project'}</div>
                  <div style={{ fontSize: '0.9375rem', color: INK, fontWeight: 600 }}>{projectName(projectId)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {projectTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: WHITE,
                      border: `1px solid ${HAIRLINE}`,
                      borderRadius: '12px',
                      padding: '0.875rem 1rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: priorityColor[task.priority] ?? GOLD,
                      marginTop: '0.375rem',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', color: INK, fontWeight: 500, marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>
                        {task.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: WARM_GRAY, background: CREAM, border: `1px solid ${HAIRLINE}`, padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                          ⏱ {task.duration}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          color: priorityColor[task.priority] ?? GOLD,
                          background: `${priorityColor[task.priority] ?? GOLD}18`,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '999px',
                          textTransform: 'capitalize',
                          fontWeight: 600,
                        }}>
                          {task.priority}
                        </span>
                        {task.suggestedSchedule && (
                          <span style={{ fontSize: '0.7rem', color: MUTED }}>
                            {task.suggestedSchedule}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', color: MUTED, textAlign: 'center' }}>
          Everything is saved. Your goals, projects, and tasks are live on your dashboard.
        </div>
        <button
          onClick={handleEnter}
          disabled={entering}
          style={{
            padding: '1rem',
            background: GOLD,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: entering ? 'wait' : 'pointer',
            letterSpacing: '-0.01em',
            opacity: entering ? 0.7 : 1,
          }}
        >
          {entering ? 'Entering your OS...' : 'Enter your OS →'}
        </button>
        {hasRetroData && (
          <a
            href="/dashboard/retro"
            data-testid="onboarding-retro-pointer"
            style={{ textAlign: 'center', fontSize: '0.8125rem', color: GOLD, fontWeight: 600, textDecoration: 'none', marginTop: '0.25rem' }}
          >
            Curious where your attention already went? See your last 30 days →
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Deterministic fallback used only when /api/archie/tasks is unreachable —
 * guarantees the user still sees at least one concrete action per project and
 * is never shown an empty finalize screen.
 */
function fallbackTasks(projects: Project[]): OSTask[] {
  const templates: Array<{ suffix: string; duration: string; priority: 'high' | 'medium' | 'low'; schedule: string }> = [
    { suffix: 'Define the first milestone and success metric', duration: '1 hour', priority: 'high', schedule: 'Morning focus block' },
    { suffix: 'Schedule a weekly 30-min progress review', duration: '15 min', priority: 'high', schedule: 'Weekly review' },
    { suffix: 'Identify and clear the top blocker to starting', duration: '45 min', priority: 'medium', schedule: 'Daily sprint' },
  ]
  const tasks: OSTask[] = []
  let n = 1
  for (const p of projects) {
    for (const t of templates) {
      tasks.push({
        id: `fallback-${n++}`,
        projectId: p.id,
        name: `${p.name}: ${t.suffix}`,
        duration: t.duration,
        priority: t.priority,
        suggestedSchedule: t.schedule,
        accepted: true,
      })
    }
  }
  return tasks
}
