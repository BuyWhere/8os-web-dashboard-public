import type { OnboardingState, DomainId, GoalDefinition, Project, OSTask, EnergyHourConfig } from './types'

const KEY = '8os_onboarding'

export function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultState()
    return { ...defaultState(), ...JSON.parse(raw) }
  } catch {
    return defaultState()
  }
}

export function saveOnboardingState(partial: Partial<OnboardingState>): OnboardingState {
  const current = getOnboardingState()
  const next = { ...current, ...partial }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function clearOnboardingState() {
  localStorage.removeItem(KEY)
}

function defaultState(): OnboardingState {
  return {
    selectedDomains: [],
    goals: {},
    archetype: 'builder',
    archetypeName: 'The Builder',
    projects: [],
    tasks: [],
    energyHours: defaultEnergyHours(),
  }
}

function defaultEnergyHours(): EnergyHourConfig {
  const hours: Record<number, 'green' | 'yellow' | 'red'> = {}
  for (let i = 0; i < 24; i++) {
    if (i >= 9 && i <= 11) hours[i] = 'green'
    else if (i >= 6 && i <= 8) hours[i] = 'yellow'
    else if (i >= 14 && i <= 16) hours[i] = 'green'
    else if (i >= 13 && i <= 17) hours[i] = 'yellow'
    else hours[i] = 'red'
  }
  return { hours }
}
