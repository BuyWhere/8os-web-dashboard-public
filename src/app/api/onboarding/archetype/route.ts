import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/require-auth'
import { calculateBazi } from '@/lib/bazi'
import { decrypt } from '@/lib/encryption'
import { scoreQuiz } from '@/lib/quiz'
import { calculateArchetype } from '@/lib/archetype'
import type { QuizAnswers } from '@/lib/quiz'
import { captureServerEvent } from '@/lib/analytics-server'
import { seedOSConfigForUser } from '@/lib/os-seeder'

// POST — run archetype calculation and persist result
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  // Load UserProfile (birth data)
  const profile = await prisma.userProfile.findUnique({ where: { userId: auth.userId } })
  if (!profile) {
    return NextResponse.json({ error: 'Birth data not found. Complete birth input first.' }, { status: 400 })
  }

  // Load quiz responses
  const responses = await prisma.quizResponse.findMany({
    where: { userId: auth.userId },
    orderBy: { questionId: 'asc' },
  })

  if (responses.length < 5) {
    return NextResponse.json({ error: 'Not enough quiz answers. Complete at least 5 questions.' }, { status: 400 })
  }

  // Decrypt birth date for BaZi recalculation
  const birthDate = decrypt(profile.birthDateEncrypted)
  const [year, month, day] = birthDate.split('-').map(Number)

  let hour: number | undefined
  if (profile.birthTimeEncrypted) {
    const birthTime = decrypt(profile.birthTimeEncrypted)
    const [h] = birthTime.split(':').map(Number)
    hour = h
  }

  const bazi = calculateBazi(year, month, day, hour)

  // Build quiz answers map
  const answers: QuizAnswers = {}
  for (const r of responses) {
    answers[r.questionId] = r.answer as 'a' | 'b' | 'c' | 'd'
  }

  const quizRaw = scoreQuiz(answers)
  const result = calculateArchetype(bazi, quizRaw)

  // Persist archetype result
  await prisma.archetypeResult.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      archetypeId: result.archetypeId,
      archetypeName: result.archetypeName,
      confidence: result.confidence,
      dominantElements: result.dominantElements,
      personalityVector: result.personalityVector as object,
      baziWeight: result.baziWeight,
      quizWeight: result.quizWeight,
      calculationLog: result.calculationLog as object,
      isHybrid: result.isHybrid,
      hybridSecondary: result.hybridSecondary ?? null,
    },
    update: {
      archetypeId: result.archetypeId,
      archetypeName: result.archetypeName,
      confidence: result.confidence,
      dominantElements: result.dominantElements,
      personalityVector: result.personalityVector as object,
      baziWeight: result.baziWeight,
      quizWeight: result.quizWeight,
      calculationLog: result.calculationLog as object,
      isHybrid: result.isHybrid,
      hybridSecondary: result.hybridSecondary ?? null,
      updatedAt: new Date(),
    },
  })

  // Mark onboarding partially done (bazi+quiz complete)
  await prisma.user.update({
    where: { id: auth.userId },
    data: { onboardingDone: false }, // full done only after goals step
  })

  captureServerEvent(auth.userId, 'archetype_calculated', {
    archetype_id: result.archetypeId,
    archetype_name: result.archetypeName,
    confidence: result.confidence,
    is_hybrid: result.isHybrid,
    hybrid_secondary: result.hybridSecondary ?? null,
    dominant_elements: result.dominantElements,
    day_element: bazi.dayElement,
  })

  // ── Seed a starter goal/project/task tree so the new user lands on
  //    a populated dashboard instead of an empty board. (OS-1892)
  //
  // Idempotent: skipped if user already has goals. Never throws — failure
  // falls back to a TS-only seed so the dashboard is never empty.
  const birthDateIso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  let seedSummary
  try {
    seedSummary = await seedOSConfigForUser({
      userId: auth.userId,
      archetypeName: result.archetypeName,
      archetypeId: result.archetypeId,
      dominantElements: result.dominantElements,
      dayElement: bazi.dayElement,
      birthDate: birthDateIso,
    })
  } catch (err) {
    // Seeding is best-effort — never block archetype completion.
    console.error('[archetype] os-seeder failed:', err)
    seedSummary = {
      seeded: false,
      skippedReason: 'seeder_failed',
      goalsCreated: 0,
      projectsCreated: 0,
      tasksCreated: 0,
      archetype: result.archetypeName,
      element: bazi.dayElement,
    }
  }

  captureServerEvent(auth.userId, 'os_seeded', {
    seeded: seedSummary.seeded,
    goals: seedSummary.goalsCreated,
    projects: seedSummary.projectsCreated,
    tasks: seedSummary.tasksCreated,
    skipped_reason: seedSummary.skippedReason ?? null,
  })

  return NextResponse.json({
    archetypeId: result.archetypeId,
    archetypeName: result.archetypeName,
    confidence: result.confidence,
    isHybrid: result.isHybrid,
    hybridSecondary: result.hybridSecondary,
    dominantElements: result.dominantElements,
    personalityVector: result.personalityVector,
    bazi: {
      dayMaster: bazi.dayMaster,
      dayElement: bazi.dayElement,
      dayPolarity: bazi.dayPolarity,
      dominantElement: bazi.dominantElement,
      pillars: bazi.pillarsText,
    },
    seed: {
      seeded: seedSummary.seeded,
      goals: seedSummary.goalsCreated,
      projects: seedSummary.projectsCreated,
      tasks: seedSummary.tasksCreated,
      skippedReason: seedSummary.skippedReason ?? null,
    },
  })
}

// GET — return existing archetype result if already calculated
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const result = await prisma.archetypeResult.findUnique({ where: { userId: auth.userId } })
  if (!result) {
    return NextResponse.json({ error: 'No archetype calculated yet' }, { status: 404 })
  }

  return NextResponse.json(result)
}
