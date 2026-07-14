'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDomain } from '@/lib/domains'
import { getOnboardingState, saveOnboardingState } from '@/lib/storage'
import type { Project, DomainId } from '@/lib/types'
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

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addDomain, setAddDomain] = useState<DomainId>('career')

  useEffect(() => {
    const state = getOnboardingState()
    if (state.selectedDomains.length === 0) {
      router.push('/onboarding/goals')
      return
    }
    if (Object.keys(state.goals).length === 0) {
      router.push('/onboarding/define')
      return
    }

    // If we have cached projects, show them
    if (state.projects.length > 0) {
      setProjects(state.projects)
      setLoading(false)
      return
    }

    // Call ARCHIE
    const goals = Object.values(state.goals)
    fetch('/api/archie/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goals,
        archetype: state.archetype,
        archetypeName: state.archetypeName,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setProjects(data.projects)
        saveOnboardingState({ projects: data.projects })
      })
      .catch(() => {
        // Minimal fallback
        const fallback = goals.map((g, i) => ({
          id: `p-${i}`,
          name: `${g.name}, Foundation`,
          description: `Core project to advance your ${g.domainId} goal.`,
          estimatedDuration: '3 months',
          suggestedOrder: i + 1,
          domainId: g.domainId,
          goalName: g.name,
          accepted: true,
        }))
        setProjects(fallback)
        saveOnboardingState({ projects: fallback })
      })
      .finally(() => setLoading(false))
  }, [])

  function toggleAccept(id: string) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, accepted: !p.accepted } : p))
  }

  function startEdit(p: Project) {
    setEditingId(p.id)
    setEditName(p.name)
  }

  function saveEdit(id: string) {
    if (editName.trim()) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: editName.trim() } : p))
    }
    setEditingId(null)
  }

  function addCustomProject() {
    if (!customName.trim()) return
    const state = getOnboardingState()
    const domain = getDomain(addDomain)
    const newProject: Project = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      description: 'Custom project added by you.',
      estimatedDuration: '3 months',
      suggestedOrder: projects.length + 1,
      domainId: addDomain,
      goalName: state.goals[addDomain]?.name ?? addDomain,
      accepted: true,
    }
    setProjects(prev => [...prev, newProject])
    setCustomName('')
    setShowAddForm(false)
  }

  function handleDragStart(id: string) {
    setDragId(id)
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return
    setProjects(prev => {
      const arr = [...prev]
      const fromIdx = arr.findIndex(p => p.id === dragId)
      const toIdx = arr.findIndex(p => p.id === targetId)
      const [item] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      return arr.map((p, i) => ({ ...p, suggestedOrder: i + 1 }))
    })
    setDragId(null)
    setDragOver(null)
  }

  function handleContinue() {
    saveOnboardingState({ projects })
    router.push('/onboarding/tasks')
  }

  const acceptedCount = projects.filter(p => p.accepted).length
  const state = typeof window !== 'undefined' ? getOnboardingState() : null

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
          <div style={{ color: INK, fontWeight: 600, marginBottom: '0.5rem' }}>ARCHIE is analyzing your goals...</div>
          <div style={{ color: WARM_GRAY, fontSize: '0.875rem' }}>Generating adaptive projects tailored to you</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Group by domain
  const byDomain = projects.reduce<Record<string, Project[]>>((acc, p) => {
    if (!acc[p.domainId]) acc[p.domainId] = []
    acc[p.domainId].push(p)
    return acc
  }, {})

  return (
    <div style={{
      minHeight: '100vh',
      background: CREAM,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '3rem 1.5rem 5rem',
    }}>
      {/* Shared step indicator */}
      <OnboardingProgress current="projects" />

      {/* Header */}
      <div style={{ maxWidth: 680, width: '100%', marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: SERIF,
          fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          marginBottom: '0.75rem',
          color: INK,
        }}>
          ARCHIE drafted your project roadmap
        </h1>
        <p style={{ color: WARM_GRAY, fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
          These are the projects ARCHIE thinks will move your goals forward. Keep the ones that fit,
          rename or reorder them, add your own, anything you remove won&apos;t generate tasks.
        </p>
      </div>

      {/* Projects by domain */}
      <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
        {Object.entries(byDomain).map(([domainId, domainProjects]) => {
          const domain = getDomain(domainId)
          if (!domain) return null

          return (
            <div key={domainId}>
              {/* Domain header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
                paddingBottom: '0.75rem',
                borderBottom: `1px solid ${domain.color}33`,
              }}>
                <span style={{ fontSize: '1.25rem' }}>{domain.icon}</span>
                <div>
                  <div style={{ fontSize: '0.65rem', color: domain.color, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{domain.label}</div>
                  <div style={{ fontSize: '0.85rem', color: WARM_GRAY }}>{domainProjects[0]?.goalName}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {domainProjects.map((project) => (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={() => handleDragStart(project.id)}
                    onDragOver={e => { e.preventDefault(); setDragOver(project.id) }}
                    onDrop={() => handleDrop(project.id)}
                    onDragLeave={() => setDragOver(null)}
                    style={{
                      background: WHITE,
                      border: `1px solid ${dragOver === project.id ? domain.color + '80' : HAIRLINE}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      opacity: project.accepted ? 1 : 0.5,
                      cursor: 'grab',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      {/* Drag handle */}
                      <div style={{ color: MUTED, fontSize: '0.75rem', paddingTop: '0.125rem', userSelect: 'none' }}>⠿</div>

                      <div style={{ flex: 1 }}>
                        {editingId === project.id ? (
                          <input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={() => saveEdit(project.id)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(project.id) }}
                            style={{
                              width: '100%',
                              padding: '0.25rem 0.5rem',
                              background: CREAM,
                              border: `1px solid ${domain.color}`,
                              borderRadius: '6px',
                              color: INK,
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              outline: 'none',
                              marginBottom: '0.375rem',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => startEdit(project)}
                            style={{
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              color: project.accepted ? INK : MUTED,
                              marginBottom: '0.25rem',
                              cursor: 'text',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {project.name}
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: MUTED }}>✏️</span>
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: WARM_GRAY, lineHeight: 1.4, marginBottom: '0.5rem' }}>
                          {project.description}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            color: WARM_GRAY,
                            background: CREAM,
                            border: `1px solid ${HAIRLINE}`,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                          }}>
                            ⏱ {project.estimatedDuration}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            background: `${domain.color}18`,
                            color: domain.color,
                            fontWeight: 600,
                          }}>
                            {domain.label}
                          </span>
                        </div>
                      </div>

                      {/* Accept/reject toggle */}
                      <button
                        onClick={() => toggleAccept(project.id)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: `1px solid ${project.accepted ? '#4F7A52' : HAIRLINE}`,
                          background: project.accepted ? '#4F7A5220' : 'transparent',
                          color: project.accepted ? '#4F7A52' : MUTED,
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {project.accepted ? '✓' : '×'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Add custom project */}
        {showAddForm ? (
          <div style={{
            background: WHITE,
            border: `1px solid ${HAIRLINE}`,
            borderRadius: '12px',
            padding: '1rem',
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                autoFocus
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomProject() }}
                placeholder="Project name..."
                style={{
                  flex: 1,
                  padding: '0.625rem 0.875rem',
                  background: CREAM,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: '8px',
                  color: INK,
                  fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
              <select
                value={addDomain}
                onChange={e => setAddDomain(e.target.value as DomainId)}
                style={{
                  padding: '0.625rem',
                  background: CREAM,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: '8px',
                  color: INK,
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              >
                {state?.selectedDomains.map(d => {
                  const dm = getDomain(d)
                  return <option key={d} value={d}>{dm?.icon} {dm?.label}</option>
                })}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={addCustomProject} style={{ padding: '0.5rem 1rem', background: GOLD, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: WARM_GRAY, border: `1px solid ${HAIRLINE}`, borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '0.85rem',
              background: 'transparent',
              border: `1px dashed var(--color-border-strong)`,
              borderRadius: '12px',
              color: WARM_GRAY,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + Add custom project
          </button>
        )}
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 680, width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', color: MUTED, textAlign: 'center' }}>
          {acceptedCount} project{acceptedCount !== 1 ? 's' : ''} accepted · ARCHIE will generate tasks for these
        </div>
        <button
          onClick={handleContinue}
          disabled={acceptedCount === 0}
          style={{
            padding: '1rem',
            background: acceptedCount > 0 ? GOLD : '#E3D8C4',
            color: acceptedCount > 0 ? '#fff' : '#A99A82',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: acceptedCount > 0 ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
          }}
        >
          Generate tasks with ARCHIE →
        </button>
      </div>
    </div>
  )
}
