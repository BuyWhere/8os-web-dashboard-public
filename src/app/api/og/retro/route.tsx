/**
 * GET /api/og/retro — shareable "Your last 30 days" verdict card (E-2).
 *
 * Same next/og ImageResponse pipeline as /api/og/archetype. Entirely
 * query-param driven and rendered from ONLY what the sharer chose to put in
 * the URL — goal names + percentages, never raw calendar/event contents:
 *
 *   ?headline=...   card headline (default "My last 30 days")
 *   ?top=...        top-fed goal line, e.g. "Ship the fund · 41%"
 *   ?starving=...   starving #1-priority line, e.g. "Health · 2%"
 *   ?sink=...       top unaligned sink line, e.g. "Netflix marathon · 12%"
 *   ?passive=...    passive-coverage percent (number, optional)
 */
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

function clean(s: string | null, max: number): string {
  return (s ?? '').replace(/[<>]/g, '').slice(0, max)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const headline = clean(searchParams.get('headline'), 80) || 'My last 30 days'
  const top = clean(searchParams.get('top'), 90)
  const starving = clean(searchParams.get('starving'), 90)
  const sink = clean(searchParams.get('sink'), 90)
  const passiveRaw = Number.parseInt(searchParams.get('passive') ?? '', 10)
  const passive = Number.isFinite(passiveRaw) ? Math.min(Math.max(passiveRaw, 0), 100) : null

  const rows: Array<{ label: string; value: string; color: string; icon: string }> = []
  if (top) rows.push({ label: 'Most-fed goal', value: top, color: '#22c55e', icon: '↑' })
  if (starving) rows.push({ label: 'Starving priority', value: starving, color: '#f59e0b', icon: '↓' })
  if (sink) rows.push({ label: 'Top unaligned sink', value: sink, color: '#9ca3af', icon: '◌' })

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          background: '#0a0a0f',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: '56px 72px',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: '50%',
            background: '#6366f1',
            opacity: 0.12,
            top: -320,
            right: -220,
            filter: 'blur(90px)',
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', letterSpacing: '-1px' }}>8OS</div>
          <div style={{ fontSize: 15, color: '#8b93a1', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Retro-alignment · where my attention actually went
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: 48,
            fontSize: headline.length > 40 ? 52 : 64,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1.08,
            display: 'flex',
            maxWidth: 1000,
          }}
        >
          {headline}
        </div>

        {/* Verdict rows */}
        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  border: `1px solid ${r.color}55`,
                  background: `${r.color}18`,
                  color: r.color,
                  fontSize: 26,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {r.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 15, color: '#8b93a1', letterSpacing: '2px', textTransform: 'uppercase' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 31, color: '#ffffff', fontWeight: 700 }}>{r.value}</div>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ fontSize: 30, color: '#9ca3af', display: 'flex' }}>
              The planner that shows where your attention actually went.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 72,
            right: 72,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 20, color: '#8b93a1', display: 'flex' }}>
            {passive !== null ? `${passive}% of this was tracked passively — zero manual logging.` : 'Right goal, right season.'}
          </div>
          <div style={{ fontSize: 22, color: '#a5b4fc', fontWeight: 700 }}>8os.ai</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
