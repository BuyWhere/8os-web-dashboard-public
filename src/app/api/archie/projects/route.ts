import { NextRequest, NextResponse } from 'next/server'
import type { GoalDefinition, Project } from '@/lib/types'

interface GenerateProjectsRequest {
  goals: GoalDefinition[]
  archetype: string
  archetypeName: string
}

export async function POST(req: NextRequest) {
  const body: GenerateProjectsRequest = await req.json()
  const { goals, archetype, archetypeName } = body

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ARCHIE_API_KEY

  if (apiKey) {
    try {
      const result = await generateWithClaude(goals, archetype, archetypeName, apiKey)
      return NextResponse.json({ projects: result })
    } catch (e) {
      console.error('ARCHIE project generation failed, using smart defaults:', e)
    }
  }

  // Fallback: smart domain-aware defaults
  const projects = generateSmartProjects(goals, archetype)
  return NextResponse.json({ projects })
}

async function generateWithClaude(
  goals: GoalDefinition[],
  archetype: string,
  archetypeName: string,
  apiKey: string
): Promise<Project[]> {
  const goalsText = goals.map((g, i) =>
    `${i + 1}. [${g.domainId.toUpperCase()}] "${g.name}", ${g.definition || 'no definition'} (measure: ${g.checkMethod})`
  ).join('\n')

  const prompt = `You are ARCHIE, the adaptive intelligence engine of 8OS, a personalized operating system.

User archetype: ${archetypeName} (${archetype})

User goals:
${goalsText}

Generate 2-3 projects per goal that are ADAPTIVE to this specific person's archetype and goals. Not generic templates.

Return ONLY a valid JSON array of projects with this exact shape:
[
  {
    "id": "unique-id",
    "name": "Project name",
    "description": "2-sentence description specific to this goal",
    "estimatedDuration": "e.g. 3 months",
    "suggestedOrder": 1,
    "domainId": "career|wealth|health|relationships|learning|legacy",
    "goalName": "the goal this belongs to",
    "accepted": true
  }
]

Rules:
- Projects must be actionable and specific to the goal, not generic
- suggestedOrder should reflect logical sequencing within each goal's projects
- Match the archetype's energy: ${archetype === 'command_center' ? 'systematic, bold, efficiency-driven' : archetype === 'organic_garden' ? 'sustainable, holistic, growth-focused' : 'structured but warm'}
- Return 8-15 projects total across all goals`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API ${response.status}`)
  const data = await response.json()
  const text = data.content[0].text

  // Extract JSON
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON in response')
  return JSON.parse(jsonMatch[0])
}

function generateSmartProjects(goals: GoalDefinition[], archetype: string): Project[] {
  const projects: Project[] = []

  const projectTemplates: Record<string, Array<{ name: string; description: string; duration: string }>> = {
    career: [
      { name: 'Skill Acceleration Sprint', description: 'Identify and master the 3 high-leverage skills that will accelerate your career goal. Build a 90-day learning roadmap with measurable milestones.', duration: '3 months' },
      { name: 'Visibility & Network Expansion', description: 'Build strategic relationships and increase your professional presence. Create content, speak at events, and connect with key decision-makers.', duration: '6 months' },
      { name: 'Execution & Delivery System', description: 'Build a system for consistent high-quality delivery. Track accomplishments, document impact, and position for the next step.', duration: '6 months' },
    ],
    wealth: [
      { name: 'Financial Foundation Audit', description: 'Map your complete financial picture: income, expenses, assets, liabilities. Identify the highest-ROI changes to make immediately.', duration: '1 month' },
      { name: 'Income Acceleration', description: 'Build systems to grow income through raises, new revenue streams, or investments. Set up automated savings and investment flows.', duration: '6 months' },
      { name: 'Wealth Compounding Engine', description: 'Implement a diversified investment strategy aligned with your timeline and risk tolerance. Automate and optimize.', duration: '12 months' },
    ],
    health: [
      { name: 'Physical Foundation', description: 'Build a sustainable training routine matched to your energy rhythms and schedule. Start with fundamentals and layer in complexity.', duration: '2 months' },
      { name: 'Nutrition & Recovery System', description: 'Optimize fueling, sleep, and recovery to support peak performance. Build routines that work with your lifestyle, not against it.', duration: '3 months' },
      { name: 'Performance Tracking', description: 'Establish baseline metrics and track progress weekly. Use data to optimize training and recovery decisions.', duration: 'Ongoing' },
    ],
    relationships: [
      { name: 'Relationship Audit & Prioritization', description: 'Map your current relationships and identify who matters most. Allocate intentional time and energy to your top connections.', duration: '2 weeks' },
      { name: 'Depth-Building Rituals', description: 'Create recurring touchpoints with your key relationships. Build habits of consistent presence, generosity, and genuine interest.', duration: '6 months' },
      { name: 'Community & Network Growth', description: 'Intentionally expand your circle with aligned people. Join communities, host gatherings, and contribute value consistently.', duration: '6 months' },
    ],
    learning: [
      { name: 'Learning System Design', description: 'Build a personalized learning stack with the right resources, schedule, and retention methods. Eliminate low-quality inputs ruthlessly.', duration: '2 weeks' },
      { name: 'Deep Skill Acquisition', description: 'Enter deliberate practice mode for your target skill. Use spaced repetition, project-based learning, and expert feedback loops.', duration: '6 months' },
      { name: 'Knowledge Application & Teaching', description: 'Apply learning through real projects and teach others to cement mastery. Document insights in a personal knowledge base.', duration: '3 months' },
    ],
    legacy: [
      { name: 'Impact Vision Clarification', description: 'Define precisely what impact you want to create, who benefits, and what success looks like at scale. Write your impact thesis.', duration: '1 month' },
      { name: 'Foundation Building', description: 'Build the knowledge, relationships, resources, and credibility needed to execute on your legacy vision. Lay the infrastructure.', duration: '12 months' },
      { name: 'First Impact Project', description: 'Launch your first initiative that creates real, measurable impact aligned to your legacy vision. Learn, iterate, scale.', duration: '6 months' },
    ],
  }

  let order = 1
  for (const goal of goals) {
    const templates = projectTemplates[goal.domainId] ?? projectTemplates.career
    for (let i = 0; i < Math.min(2, templates.length); i++) {
      const t = templates[i]
      projects.push({
        id: `${goal.domainId}-${i}-${Date.now()}`,
        name: t.name,
        description: t.description,
        estimatedDuration: t.duration,
        suggestedOrder: order++,
        domainId: goal.domainId,
        goalName: goal.name,
        accepted: true,
      })
    }
  }

  return projects
}
