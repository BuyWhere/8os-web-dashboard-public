/**
 * OS-7620 — memory consolidation must not flag assistant-only windows.
 *
 * Prod signal: 449 `$exception` "0 candidates on non-trivial input" in 7 days,
 * 85% of them `parsed:true, attempts:2, journalCount:0, messageCount:1` — the
 * single message being the assistant's own check-in. That is a legitimately
 * empty window, not an extraction miss. The gate now measures USER-authored
 * text only.
 */

jest.mock('@/lib/db/prisma', () => ({ prisma: {} }))
jest.mock('@/lib/flow-ai', () => ({ createChatCompletion: jest.fn() }))
jest.mock('@/lib/error-track', () => ({ captureServerException: jest.fn() }))

import { renderSources } from '../memory/extract'

const render = renderSources

describe('renderSources userTextLength (OS-7620)', () => {
  it('assistant-only window: userTextLength stays 0 even when text is long', () => {
    const assistantGreeting =
      'Hey! Just checking in — how did the week go? If you want, we can look at what is still open on your goals and figure out what to tackle next. No pressure either way; whenever you have a moment.'
    const r = render(
      [],
      [{ id: 'm1', role: 'assistant', content: assistantGreeting }],
    )
    expect(r.hasContent).toBe(true)
    expect(r.text.length).toBeGreaterThan(200) // would have tripped the old gate
    expect(r.userTextLength).toBe(0)
  })

  it('user chat turn counts toward userTextLength', () => {
    const r = render(
      [],
      [{ id: 'm1', role: 'user', content: 'I decided to move to Lisbon in August.' }],
    )
    expect(r.userTextLength).toBeGreaterThan(0)
  })

  it('journals count toward userTextLength', () => {
    const r = render(
      [{ id: 'j1', content: 'Shipped the parser fix today.', kind: 'free', mood: null }],
      [],
    )
    expect(r.userTextLength).toBe('Shipped the parser fix today.'.length)
  })

  it('mixed window sums only user-authored text', () => {
    const r = render(
      [{ id: 'j1', content: 'Ran 5k.', kind: 'free', mood: null }],
      [
        { id: 'm1', role: 'assistant', content: 'Great job staying consistent this week!' },
        { id: 'm2', role: 'user', content: 'Thanks, but my knee hurt after.' },
      ],
    )
    expect(r.userTextLength).toBe('Ran 5k.'.length + 'Thanks, but my knee hurt after.'.length)
  })

  it('blank/whitespace content contributes nothing', () => {
    const r = render(
      [{ id: 'j1', content: '   ', kind: 'free', mood: null }],
      [{ id: 'm1', role: 'user', content: null as unknown as string }],
    )
    expect(r.hasContent).toBe(false)
    expect(r.userTextLength).toBe(0)
  })
})
