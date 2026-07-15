// ─── Domain IDs ───────────────────────────────────────────────────────────────

export type DomainId = 'career' | 'wealth' | 'health' | 'relationships' | 'learning' | 'legacy'

export type CheckMethod = 'binary' | 'numeric' | 'time' | 'streak' | 'milestone'

// ─── Goal Definition ──────────────────────────────────────────────────────────

export interface GoalDefinition {
  domainId: DomainId
  name: string
  definition: string
  checkMethod: CheckMethod
  checkConfig: {
    unit?: string       // for numeric/time
    target?: number     // for numeric/time/streak
    milestones?: string[] // for milestone
  }
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description: string
  estimatedDuration: string
  suggestedOrder: number
  domainId: DomainId
  goalName: string
  accepted: boolean
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface OSTask {
  id: string
  projectId: string
  name: string
  duration: string
  priority: 'high' | 'medium' | 'low'
  suggestedSchedule: string
  accepted: boolean
}

// ─── Energy Hours ─────────────────────────────────────────────────────────────

export type EnergyLevel = 'green' | 'yellow' | 'red'

export interface EnergyHourConfig {
  hours: Record<number, EnergyLevel>  // 0-23 hour index → energy level
}

// ─── Onboarding State ─────────────────────────────────────────────────────────

export interface OnboardingState {
  selectedDomains: DomainId[]
  goals: Partial<Record<DomainId, GoalDefinition>>
  archetype: string
  archetypeName: string
  projects: Project[]
  tasks: OSTask[]
  energyHours: EnergyHourConfig
  completedAt?: string
}

// ─── Domain Metadata ──────────────────────────────────────────────────────────

export interface DomainMeta {
  id: DomainId
  label: string
  icon: string
  color: string
  accent: string
  description: string
  promptHint: string
  defaultCheckMethod: CheckMethod
  suggestions: string[]
}
