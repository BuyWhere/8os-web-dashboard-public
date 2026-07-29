/**
 * GET /api/alignment/tool-spec — the JSON-Schema spec the v1 Alignment Engine
 * advertises in its summary route (`routes.toolSpec`). Lets a remote assistant
 * (or any HTTP client) fetch a stable, self-describing manifest of the
 * alignment tool contract before invoking `/api/alignment/tool-call`.
 *
 * The schema mirrors the fields on `AlignmentResult` (src/lib/alignment-engine.ts)
 * so callers can validate arguments and consume results without reading the
 * engine source. It does NOT expose any user-specific data — auth is required
 * to keep the surface internal, but the payload is identical for every user.
 *
 * Companion route: POST /api/alignment/tool-call.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authOrQa } from '@/lib/memory/qa-auth'
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Static, deterministic tool manifest. Versioned via `version` so callers can
// pin a snapshot when wiring their integration.
const TOOL_SPEC_VERSION = '1.0.0'

const alignmentToolSpec = {
  version: TOOL_SPEC_VERSION,
  name: 'get_alignment',
  description:
    'Returns the user\'s current Alignment Engine verdict — per-goal attention share vs priority weight, momentum (fed | flat | starving), the daily + weekly headline, the top redirection proposal, and a bounded list of receipts (each attribution id is tappable to /api/alignment/correct). Bounded cost: this is the on-demand GET /api/alignment pipeline; no cron, no extra LLM outside the attribution pass that the request itself triggers.',
  input: {
    type: 'object',
    additionalProperties: false,
    properties: {
      days: {
        type: 'integer',
        minimum: 1,
        maximum: 60,
        default: 7,
        description: 'Lookback window in days. Default 7 (weekly); pass 30 for monthly review.',
      },
      full: {
        type: 'boolean',
        default: false,
        description: 'If true, runs a deeper 30-day backfill with a higher LLM item cap. Admin/dev use only.',
      },
      debug: {
        type: 'boolean',
        default: false,
        description: 'If true, includes raw attributions for the window plus attribution-run stats (correction rate, cache hits, last Flow-AI call lane). QA-only by convention.',
      },
    },
  },
  output: {
    type: 'object',
    required: ['attribution', 'ledger', 'asOf', 'windowDays', 'daily', 'weekly'],
    properties: {
      asOf: { type: 'string', description: 'ISO timestamp the verdict was assembled at.' },
      windowDays: { type: 'integer', description: 'Days the engine actually computed against.' },
      attribution: {
        type: 'object',
        description: 'AttributionRunStats — see src/lib/alignment-engine.ts.',
        properties: {
          scanned: { type: 'integer' },
          alreadyAttributed: { type: 'integer' },
          groundTruth: { type: 'integer' },
          llmClassified: { type: 'integer' },
          llmUnclassified: { type: 'integer' },
          llmBatches: { type: 'integer' },
          llmDeferred: { type: 'integer' },
          cacheReused: { type: 'integer' },
          budgetDegraded: { type: 'boolean' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
      ledger: {
        type: 'array',
        description: 'Per-(goal, day) attention rows for the window. Each row carries goalId|UNALIGNED, minutes, actions, mentions.',
        items: { type: 'object' },
      },
      daily: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          unalignedShare: { type: ['number', 'null'] },
        },
      },
      weekly: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          topRedirection: { type: 'string' },
          perGoal: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                goalId: { type: 'string' },
                name: { type: 'string' },
                domain: { type: 'string' },
                rank: { type: 'integer' },
                share: { type: 'number' },
                expectedShare: { type: 'number' },
                minutes: { type: 'number' },
                actions: { type: 'integer' },
                mentions: { type: 'integer' },
                momentum: { type: 'string', enum: ['fed', 'flat', 'starving'] },
                inSeason: { type: ['boolean', 'null'] },
                seasonVerdict: { type: ['string', 'null'] },
              },
            },
          },
          unalignedShare: { type: 'number' },
          receipts: {
            type: 'array',
            description: 'Tappable receipts — each carries attributionId for /api/alignment/correct.',
            items: {
              type: 'object',
              properties: {
                attributionId: { type: 'string' },
                sourceType: { type: 'string', enum: ['calendar', 'task', 'journal', 'chat', 'external_calendar'] },
                sourceDate: { type: 'string' },
                goalId: { type: ['string', 'null'] },
                goal: { type: ['string', 'null'] },
                weight: { type: 'string', enum: ['direct', 'supporting', 'unrelated', 'counter'] },
                minutes: { type: 'number' },
                rationale: { type: 'string' },
                confidence: { type: ['number', 'null'] },
                userOverride: { type: 'boolean' },
              },
            },
          },
        },
      },
      redirection: { type: ['object', 'null'] },
    },
  },
  // Companion endpoints — what the client should call to mutate state.
  companion: {
    correct: 'POST /api/alignment/correct',
    rank: 'POST /api/alignment/rank',
  },
}

export async function GET(req: NextRequest) {
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const limited = enforceRateLimit(req, RATE_LIMITS.alignment, auth.userId)
  if (limited) return limited

  return NextResponse.json(alignmentToolSpec, {
    headers: {
      // The spec rarely changes (only on schema additions); let intermediaries cache.
      'Cache-Control': 'private, max-age=60',
    },
  })
}