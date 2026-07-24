/**
 * src/lib/subtasks.ts — checklist items on a task.
 *
 * Stored as a self-applying `subtasks` jsonb column on os_tasks (CREATE-only
 * ALTER … IF NOT EXISTS + raw SQL reads/writes, same migration-free pattern as
 * calendar-prefs and coach_plays). Shape: [{ id, text, done }], capped at 30.
 */
import { prisma } from '@/lib/db/prisma'

export interface Subtask {
  id: string
  text: string
  done: boolean
}

let _ensured: Promise<void> | null = null
function ensure(): Promise<void> {
  if (!_ensured) {
    _ensured = prisma
      .$executeRawUnsafe(`ALTER TABLE os_tasks ADD COLUMN IF NOT EXISTS subtasks jsonb`)
      .then(() => undefined)
      .catch((e) => { _ensured = null; throw e })
  }
  return _ensured
}

export function sanitizeSubtasks(input: unknown): Subtask[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .slice(0, 30)
    .map((s, i) => ({
      id: typeof s.id === 'string' && s.id ? s.id.slice(0, 40) : `st-${i}-${Math.abs(JSON.stringify(s).length)}`,
      text: typeof s.text === 'string' ? s.text.slice(0, 300) : '',
      done: s.done === true,
    }))
    .filter((s) => s.text.length > 0)
}

/** Subtasks for a set of task ids (empty map on any failure — never throws). */
export async function getSubtasksFor(userId: string, taskIds: string[]): Promise<Map<string, Subtask[]>> {
  const out = new Map<string, Subtask[]>()
  if (taskIds.length === 0) return out
  try {
    await ensure()
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; subtasks: unknown }>>(
      `SELECT id, subtasks FROM os_tasks WHERE "userId" = $1 AND id = ANY($2::text[]) AND subtasks IS NOT NULL`,
      userId, taskIds,
    )
    for (const r of rows) {
      const list = sanitizeSubtasks(r.subtasks)
      if (list.length) out.set(r.id, list)
    }
  } catch { /* empty map */ }
  return out
}

export async function setSubtasks(userId: string, taskId: string, subtasks: Subtask[]): Promise<void> {
  await ensure()
  await prisma.$executeRawUnsafe(
    `UPDATE os_tasks SET subtasks = $3::jsonb WHERE id = $1 AND "userId" = $2`,
    taskId, userId, JSON.stringify(subtasks.slice(0, 30)),
  )
}
