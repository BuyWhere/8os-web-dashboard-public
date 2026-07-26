/**
 * Coaching Engine — pure nudge generation, no I/O.
 *
 * Converts DriftSignals into archetype-appropriate CoachingNudges.
 * No Prisma, no alignment engine — safe to import in tests.
 */

import { getArchetypeById, ARCHETYPES, ArchetypeDefinition } from './archetype'
import type { DriftSignal, DriftSignalType, CoachingNudge } from './drift-engine'

// Re-export the shared types for consumers
export type { DriftSignal, DriftSignalType, CoachingNudge } from './drift-engine'

export function generateCoachingNudges(
  signals: DriftSignal[],
  userId: string,
  archetypeId: string = 'pioneer'
): CoachingNudge[] {
  const archetype = getArchetypeById(archetypeId) ?? ARCHETYPES[0]
  const tone = getCoachingStyle(archetype)
  const nudges: CoachingNudge[] = []

  for (const signal of signals) {
    const nudge = signalToNudge(signal, archetype, tone)
    if (nudge) nudges.push(nudge)
  }

  return nudges.sort((a, b) => a.priority - b.priority)
}

type CoachingTone = 'supportive' | 'direct' | 'challenging'

function getCoachingStyle(archetype: ArchetypeDefinition): CoachingTone {
  const profile = archetype.quizProfile ?? {}
  if ((profile.goalDriven ?? 0) > 0.7 && (profile.leaderCharismatic ?? 0) > 0.6) return 'direct'
  if ((profile.intuitive ?? 0) > 0.6 && (profile.rechargeIntrovert ?? 0) > 0.6)
    return 'supportive'
  if ((profile.systematic ?? 0) > 0.6 && (profile.processDriven ?? 0) > 0.6)
    return 'challenging'
  if (archetype.id === 'sage' || archetype.id === 'nurturer') return 'supportive'
  if (archetype.id === 'pioneer' || archetype.id === 'warrior') return 'direct'
  return 'challenging'
}

interface ToneMessages {
  abandonmentTitle: string
  abandonmentMsg: string
  inversionTitle: string
  inversionMsg: string
  calendarTitle: string
  calendarMsg: string
  streakTitle: string
  streakMsg: string
  completionTitle: string
  completionMsg: string
  scopeTitle: string
  scopeMsg: string
}

function getToneMessages(tone: CoachingTone): ToneMessages {
  const messages: Record<CoachingTone, ToneMessages> = {
    direct: {
      abandonmentTitle: 'Goal Abandoned',
      abandonmentMsg: '{goal} is being neglected. Decide: commit or defer.',
      inversionTitle: 'Priority Inverted',
      inversionMsg: 'Your actions don\'t match your priorities on {goal}. Fix it.',
      calendarTitle: 'Calendar Misaligned',
      calendarMsg: 'Your calendar says one thing, your work says another for {goal}.',
      streakTitle: 'Momentum Lost',
      streakMsg: 'You\'ve gone quiet. Log something today to stay on track.',
      completionTitle: 'Completion Slowing',
      completionMsg: 'Your completion rate dropped. Finish what you started.',
      scopeTitle: 'Scope Creep Alert',
      scopeMsg: 'Too many new goals, not enough completions. Focus.',
    },
    supportive: {
      abandonmentTitle: 'Goal Needs Attention',
      abandonmentMsg: '{goal} seems to have slipped. Would you like to revisit it?',
      inversionTitle: 'Priority Check',
      inversionMsg: 'Your time doesn\'t match your intentions for {goal}. Let\'s find a way forward.',
      calendarTitle: 'Calendar Harmony',
      calendarMsg: 'There\'s a gap between your calendar and your work on {goal}. Want to reconcile?',
      streakTitle: 'Missing Your Streak',
      streakMsg: 'It\'s been a few days. Any small step would help rebuild momentum.',
      completionTitle: 'Completion Reflection',
      completionMsg: 'Things might be feeling overwhelming. Let\'s break it down.',
      scopeTitle: 'Lots on Your Plate',
      scopeMsg: 'You\'ve added several new goals. Want to complete one older one first?',
    },
    challenging: {
      abandonmentTitle: 'Abandonment Pattern',
      abandonmentMsg: '{goal} fell off. Either own it or formally drop it.',
      inversionTitle: 'Inverted Priorities',
      inversionMsg: 'Your priority rank doesn\'t match your attention. Unacceptable.',
      calendarTitle: 'Calendar-Work Disconnect',
      calendarMsg: 'Scheduled time for {goal} isn\'t translating to actual work.',
      streakTitle: 'Streak Broken',
      streakMsg: 'Zero activity = zero progress. Log something immediately.',
      completionTitle: 'Backlog Growing',
      completionMsg: 'More starts than finishes. This is a pattern to break.',
      scopeTitle: 'Spreading Too Thin',
      scopeMsg: 'New goals while old ones linger. Narrow focus = results.',
    },
  }
  return messages[tone]
}

function signalToNudge(
  signal: DriftSignal,
  archetype: ArchetypeDefinition,
  tone: CoachingTone
): CoachingNudge | null {
  const toneMessages = getToneMessages(tone)
  const now = new Date()
  const base: Omit<CoachingNudge, 'title' | 'message' | 'tone'> = {
    id: `nudge-${signal.type}-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
    signalType: signal.type,
    archetypeId: archetype.id,
    priority:
      signal.severity === 'high' ? 1 : signal.severity === 'medium' ? 2 : 3,
  }

  switch (signal.type) {
    case 'goal_abandonment':
      return {
        ...base,
        title: toneMessages.abandonmentTitle,
        message: toneMessages.abandonmentMsg.replace('{goal}', signal.goalName ?? 'your goal'),
        suggestedAction: 'Review this goal: either recommit or formally defer it.',
        cta: 'Review Goal',
        tone,
      }
    case 'priority_inversion':
      return {
        ...base,
        title: toneMessages.inversionTitle,
        message: toneMessages.inversionMsg.replace('{goal}', signal.goalName ?? 'priorities'),
        suggestedAction: 'Block time specifically for this priority.',
        cta: 'Block Time',
        tone,
      }
    case 'calendar_mismatch':
      return {
        ...base,
        title: toneMessages.calendarTitle,
        message: toneMessages.calendarMsg.replace('{goal}', signal.goalName ?? 'aligned work'),
        suggestedAction: 'Either adjust calendar blocks or remove them.',
        cta: 'Fix Calendar',
        tone,
      }
    case 'streak_break':
      return {
        ...base,
        title: toneMessages.streakTitle,
        message: toneMessages.streakMsg,
        suggestedAction: 'Log one small action today to restart momentum.',
        cta: 'Log Activity',
        tone,
      }
    case 'completion_rate_drop':
      return {
        ...base,
        title: toneMessages.completionTitle,
        message: toneMessages.completionMsg,
        suggestedAction: 'Break remaining tasks into smaller pieces.',
        cta: 'Break Tasks',
        tone,
      }
    case 'scope_creep':
      return {
        ...base,
        title: toneMessages.scopeTitle,
        message: toneMessages.scopeMsg,
        suggestedAction: 'Complete one older goal before adding more.',
        cta: 'Focus',
        tone,
      }
    default:
      return null
  }
}
