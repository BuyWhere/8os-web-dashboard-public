/**
 * GET /api/og/archetype?name=...&element=...
 *
 * Dynamic, branded OG card for ANY ARCHIE-computed archetype (thousands of
 * names), driven by query params so the reveal + onboarding pages can point
 * og:image straight at it. Uses Next's built-in ImageResponse (next/og) — no
 * extra dependency.
 *
 * (The sibling route /api/og/archetype/[name] serves the 5 legacy fixed
 * archetype ids; this query-param route serves the granular ARCHIE names.)
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const ELEMENT_COLORS: Record<string, string> = {
  wood: '#4FAE6F', fire: '#E8623D', earth: '#F5A623', metal: '#8C97A6', water: '#3B82B6',
}
const ELEMENT_ICONS: Record<string, string> = {
  wood: '🌱', fire: '🔥', earth: '🌍', metal: '⚙️', water: '🌊',
}
const ELEMENT_LABEL: Record<string, string> = {
  wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water',
}

function clean(s: string, max: number): string {
  return s.replace(/[<>]/g, '').slice(0, max)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = clean(searchParams.get('name') || 'Your Archetype', 60)
  const elementRaw = (searchParams.get('element') || 'earth').toLowerCase()
  const element = ELEMENT_COLORS[elementRaw] ? elementRaw : 'earth'
  const color = ELEMENT_COLORS[element]
  const icon = ELEMENT_ICONS[element]
  const elementLabel = ELEMENT_LABEL[element]

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Sunrise glow */}
        <div
          style={{
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: '50%',
            background: color,
            opacity: 0.1,
            top: -220,
            left: '50%',
            transform: 'translateX(-50%)',
            filter: 'blur(90px)',
          }}
        />

        {/* Brand */}
        <div style={{ position: 'absolute', top: 44, left: 64, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', letterSpacing: '-1px' }}>8OS</div>
          <div style={{ fontSize: 15, color: '#8b93a1', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Right goal, right season
          </div>
        </div>

        {/* Element badge */}
        <div
          style={{
            marginBottom: 26,
            padding: '8px 22px',
            borderRadius: 999,
            border: `1px solid ${color}`,
            color: color,
            fontSize: 18,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{icon}</span>
          <span>{elementLabel} Element</span>
        </div>

        {/* Archetype name */}
        <div
          style={{
            fontSize: name.length > 24 ? 64 : 78,
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            letterSpacing: '-2px',
            lineHeight: 1.08,
            display: 'flex',
            maxWidth: 1000,
            padding: '0 40px',
          }}
        >
          {name}
        </div>

        {/* Sub */}
        <div style={{ marginTop: 22, fontSize: 27, color: '#9ca3af', textAlign: 'center', fontStyle: 'italic', display: 'flex' }}>
          The planner that knows when to push.
        </div>

        {/* Bottom CTA */}
        <div style={{ position: 'absolute', bottom: 44, display: 'flex', alignItems: 'center', gap: 10, color: '#8b93a1', fontSize: 18 }}>
          <span>See your archetype free at</span>
          <span style={{ color: color, fontWeight: 700 }}>8os.ai/reveal</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
