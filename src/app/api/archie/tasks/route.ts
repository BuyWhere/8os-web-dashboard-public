import { NextRequest, NextResponse } from 'next/server'
import type { Project, OSTask } from '@/lib/types'
import { createChatCompletion } from '@/lib/flow-ai'

interface GenerateTasksRequest {
  projects: Project[]
  archetype: string
  archetypeName: string
}

export async function POST(req: NextRequest) {
  const body: GenerateTasksRequest = await req.json()
  const { projects, archetype, archetypeName } = body

  // Per BUILD-DIRECTIVE, all LLM inference goes through Flow AI (our own
  // OpenAI-compatible inference product) via @/lib/flow-ai, which reads
  // FLOW_AI_API_KEY internally.
  if (process.env.FLOW_AI_API_KEY) {
    try {
      const result = await generateWithFlowAI(projects, archetype, archetypeName)
      return NextResponse.json({ tasks: result })
    } catch (e) {
      console.error('ARCHIE task generation failed, using smart defaults:', e)
    }
  }

  const tasks = generateSmartTasks(projects, archetype)
  return NextResponse.json({ tasks })
}

async function generateWithFlowAI(
  projects: Project[],
  archetype: string,
  archetypeName: string
): Promise<OSTask[]> {
  const accepted = projects.filter(p => p.accepted)
  const projectsText = accepted.map((p, i) =>
    `${i + 1}. [${p.domainId}] "${p.name}" (${p.estimatedDuration}), ${p.description}`
  ).join('\n')

  const prompt = `You are ARCHIE, the adaptive intelligence engine of 8OS.

User archetype: ${archetypeName} (${archetype})

Projects to generate tasks for:
${projectsText}

Generate 3-5 specific, actionable tasks per project. Tasks must be concrete next actions, not vague directions.

Return ONLY a valid JSON array:
[
  {
    "id": "unique-id",
    "projectId": "must match one of the project names, use slugified project name",
    "name": "Specific action verb + object",
    "duration": "e.g. 45 min, 2 hours",
    "priority": "high|medium|low",
    "suggestedSchedule": "e.g. Morning deep work, Weekly review, Daily habit",
    "accepted": true
  }
]

Rules:
- Tasks start with action verbs (Write, Schedule, Build, Research, Call, etc.)
- Duration reflects realistic time investment
- Priority: high = critical path, medium = important, low = nice to have
- suggestedSchedule should match the user's archetype energy pattern
- Return 15-30 tasks total`

  const completion = await createChatCompletion(
    [{ role: 'user', content: prompt }],
    { tool_choice: 'none', max_tokens: 3000 },
  )

  const text = completion.choices?.[0]?.message?.content
  if (!text) throw new Error('Flow AI returned empty content')

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON in response')
  const tasks: OSTask[] = JSON.parse(jsonMatch[0])

  // Map projectId from name slug to actual project id
  return tasks.map(t => {
    const matchedProject = accepted.find(p =>
      slugify(p.name) === t.projectId || p.name.toLowerCase().includes(t.projectId.toLowerCase().replace(/-/g, ' '))
    )
    return { ...t, projectId: matchedProject?.id ?? accepted[0]?.id ?? t.projectId }
  })
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function generateSmartTasks(projects: Project[], archetype: string): OSTask[] {
  const tasks: OSTask[] = []

  const scheduleMap: Record<string, string[]> = {
    command_center: ['Morning focus block', 'Weekly deep dive', 'Daily 30-min sprint', 'End-of-week review'],
    organic_garden: ['Morning ritual', 'Mid-day flow state', 'Weekly reflection', 'Daily practice'],
    morning_sunshine: ['Early morning session', 'Daily check-in', 'Weekly planning'],
    family_garden: ['Morning before family wakes', 'Weekend deep work', 'Evening review'],
  }
  const schedules = scheduleMap[archetype] ?? scheduleMap.command_center

  const taskBank: Record<string, Array<{ name: string; duration: string; priority: 'high' | 'medium' | 'low' }>> = {
    'Skill Acceleration Sprint': [
      { name: 'Identify top 3 skills to accelerate your goal', duration: '1 hour', priority: 'high' },
      { name: 'Build 90-day learning roadmap with weekly milestones', duration: '2 hours', priority: 'high' },
      { name: 'Schedule 5 hours/week dedicated learning blocks', duration: '30 min', priority: 'high' },
      { name: 'Find 1 mentor or accountability partner in target skill', duration: '1 hour', priority: 'medium' },
    ],
    'Visibility & Network Expansion': [
      { name: 'Write and publish 1 article about your expertise', duration: '3 hours', priority: 'high' },
      { name: 'Reach out to 5 key people in your target network', duration: '1 hour', priority: 'high' },
      { name: 'Apply to speak at 3 relevant conferences or events', duration: '2 hours', priority: 'medium' },
    ],
    'Financial Foundation Audit': [
      { name: 'Export and categorize last 3 months of expenses', duration: '2 hours', priority: 'high' },
      { name: 'Calculate exact net worth and monthly cash flow', duration: '1 hour', priority: 'high' },
      { name: 'Identify top 3 expenses to cut without quality impact', duration: '45 min', priority: 'high' },
    ],
    'Income Acceleration': [
      { name: 'Research salary data for target role/income level', duration: '1 hour', priority: 'high' },
      { name: 'Set up automatic transfers to savings/investment accounts', duration: '30 min', priority: 'high' },
      { name: 'Identify 2 potential side income streams to test', duration: '2 hours', priority: 'medium' },
    ],
    'Physical Foundation': [
      { name: 'Schedule 4 weekly training sessions in calendar', duration: '15 min', priority: 'high' },
      { name: 'Define baseline fitness metrics and track them', duration: '30 min', priority: 'high' },
      { name: 'Build progressive 12-week training program', duration: '1 hour', priority: 'high' },
      { name: 'Prep workout gear and space the night before', duration: '10 min', priority: 'low' },
    ],
  }

  const defaultTasks = [
    { name: 'Define success metrics and first milestone', duration: '1 hour', priority: 'high' as const },
    { name: 'Schedule weekly 30-min progress review', duration: '15 min', priority: 'high' as const },
    { name: 'Identify and remove top 3 blockers to starting', duration: '45 min', priority: 'medium' as const },
    { name: 'Find resources, tools, or experts needed', duration: '1 hour', priority: 'medium' as const },
  ]

  let taskId = 1
  for (const project of projects) {
    if (!project.accepted) continue
    const specific = taskBank[project.name] ?? defaultTasks
    for (let i = 0; i < Math.min(3, specific.length); i++) {
      const t = specific[i]
      tasks.push({
        id: `task-${taskId++}`,
        projectId: project.id,
        name: t.name,
        duration: t.duration,
        priority: t.priority,
        suggestedSchedule: schedules[i % schedules.length],
        accepted: true,
      })
    }
  }

  return tasks
}
