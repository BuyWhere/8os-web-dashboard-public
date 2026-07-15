/**
 * POST /api/schedule/auto
 * Batch / auto-plan: schedules many unscheduled tasks into free slots in one call
 * by looping the SAME conflict-free path used by POST /api/schedule
 * (findBestSlot → scheduledAt + CalendarEvent). This is a thin BATCH WRAPPER only —
 * it adds no new scheduling logic and reuses the neutral (no-energy) slot finder.
 *
 * Each task placed in the loop is added to the in-memory conflict list so the next
 * task in the batch lands in a NON-OVERLAPPING slot. Existing CalendarEvents
 * (including user-created "Focus" blocks) are pulled up front and treated as BUSY,
 * so the batch respects focus-block defense automatically.
 *
 * Body:
 *   { taskIds?: string[],  // optional explicit selection; default = all unscheduled todo tasks
 *     searchFrom?: ISO,     // default now
 *     searchDays?: number } // default 7 (1..30)
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { authOrQa } from "@/lib/memory/qa-auth"
import { findBestSlot, type ExistingEvent } from "@/lib/scheduling/engine"
import { getExternalBusyWindows } from "@/lib/external/google-calendar"
import { captureServerException } from "@/lib/error-track"
import { getBehaviorTokens, defaultBlockMinutes } from "@/lib/behavior-tokens"
import { getBiasFactor, padEstimate, paddingNote } from "@/lib/estimation-bias"
import { z } from "zod"

const Schema = z.object({
  taskIds: z.array(z.string().uuid()).optional(),
  searchFrom: z.string().datetime().optional(),
  searchDays: z.number().int().min(1).max(30).default(7),
})

// Neutral energy map (all hours equal) — identical to /api/schedule. No energy bias.
const NEUTRAL_ENERGY_MAP: Record<number, "green"> = Object.fromEntries(
  Array.from({ length: 24 }, (_, i) => [i, "green" as const])
)

export async function POST(req: NextRequest) {
  // authOrQa: prod = plain requireAuth; QA header resolves @qa.8os.ai only.
  const auth = await authOrQa(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const searchFrom = parsed.data.searchFrom ? new Date(parsed.data.searchFrom) : new Date()
  const searchEnd = new Date(searchFrom)
  searchEnd.setDate(searchEnd.getDate() + parsed.data.searchDays)

  const userId = auth.userId

  try {
  // Select the tasks to schedule: explicit selection, or every unscheduled todo task.
  const tasks = await prisma.oSTask.findMany({
    where: {
      userId: auth.userId,
      status: "todo",
      scheduledAt: null,
      ...(parsed.data.taskIds && parsed.data.taskIds.length > 0
        ? { id: { in: parsed.data.taskIds } }
        : {}),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })

  // Pull existing calendar events (focus blocks, prior placements, bookings) as BUSY.
  const existingEvents: ExistingEvent[] = (
    await prisma.calendarEvent.findMany({
      where: { userId: auth.userId, startAt: { gte: searchFrom }, endAt: { lte: searchEnd } },
      select: { startAt: true, endAt: true },
    })
  ).map((e) => ({ startAt: e.startAt, endAt: e.endAt }))

  // E-1: non-deleted external calendar events are BUSY for the whole batch.
  existingEvents.push(...(await getExternalBusyWindows(auth.userId, searchFrom, searchEnd)))

  const scheduled: Array<{
    taskId: string
    name: string
    startAt: string
    endAt: string
    rawMinutes: number
    scheduledMinutes: number
    biasFactor: number
    padded: boolean
    note: string | null
  }> = []
  const unplaced: Array<{ taskId: string; name: string }> = []

  // ── E-11 · scheduling_style default block length (deep_blocks 90 / varied 45). ──
  const tokens = await getBehaviorTokens(userId)
  const styleDefault = defaultBlockMinutes(tokens.scheduling_style)

  // Resolve goal-domains once for tasks lacking an own domainId (E-12 bias key).
  const goalIds = Array.from(new Set(tasks.map((t) => t.goalId).filter(Boolean))) as string[]
  const goals = goalIds.length
    ? await prisma.goal.findMany({ where: { id: { in: goalIds }, userId }, select: { id: true, domainId: true } })
    : []
  const goalDomain = new Map(goals.map((g) => [g.id, g.domainId]))
  const biasCache = new Map<string, number>()
  const biasFor = async (domainId: string | null): Promise<number> => {
    if (!domainId) return 1.0
    if (biasCache.has(domainId)) return biasCache.get(domainId)!
    const f = await getBiasFactor(userId, domainId)
    biasCache.set(domainId, f)
    return f
  }

  for (const task of tasks) {
    const domainForBias = task.domainId ?? (task.goalId ? goalDomain.get(task.goalId) ?? null : null)
    // E-12 estimate wins; else the E-11 scheduling_style default block length.
    const rawEstimate =
      (task as { estimatedMinutes?: number | null }).estimatedMinutes ?? styleDefault
    const biasFactor = await biasFor(domainForBias)
    const { paddedMinutes, padded } = padEstimate(rawEstimate, biasFactor)
    const note = domainForBias ? paddingNote(domainForBias, biasFactor) : null

    const slot = findBestSlot({
      durationMinutes: paddedMinutes,
      energyRequired: "green",
      energyMap: NEUTRAL_ENERGY_MAP,
      existingEvents, // grows each iteration → no two batch tasks overlap
      searchFrom,
      searchDays: parsed.data.searchDays,
    })

    if (!slot) {
      unplaced.push({ taskId: task.id, name: task.name })
      continue
    }

    await prisma.oSTask.update({
      where: { id: task.id },
      data: { scheduledAt: slot.startAt, scheduledEnd: slot.endAt },
    })
    await prisma.calendarEvent.deleteMany({ where: { taskId: task.id } })
    await prisma.calendarEvent.create({
      data: {
        userId: auth.userId,
        taskId: task.id,
        title: task.name,
        startAt: slot.startAt,
        endAt: slot.endAt,
        domainId: task.domainId,
      },
    })

    // Reserve this slot for the rest of the batch.
    existingEvents.push({ startAt: slot.startAt, endAt: slot.endAt })
    scheduled.push({
      taskId: task.id,
      name: task.name,
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      rawMinutes: rawEstimate,
      scheduledMinutes: paddedMinutes,
      biasFactor,
      padded,
      note,
    })
  }

  // Surface the distinct honest padding notes once at the batch level too.
  const notes = Array.from(new Set(scheduled.map((s) => s.note).filter(Boolean))) as string[]

  return NextResponse.json({
    scheduledCount: scheduled.length,
    unplacedCount: unplaced.length,
    schedulingStyle: tokens.scheduling_style,
    notes,
    scheduled,
    unplaced,
  })
  } catch (err) {
    console.error("[schedule/auto] failed:", err)
    captureServerException(err, { route: "/api/schedule/auto", userId: auth.userId })
    return NextResponse.json({ error: "Auto-scheduling failed." }, { status: 500 })
  }
}
