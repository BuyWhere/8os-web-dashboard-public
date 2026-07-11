/** Shared types for the Today view + inbox components (OS-2109). */

export type EnergyLevel = 'green' | 'yellow' | 'red'

export interface InboxTask {
  id: string
  name: string
  notes?: string
  duration: number
  priority: 'high' | 'medium' | 'low'
  energyRequired: EnergyLevel
  domainId?: string | null
  projectId?: string | null
  projectName?: string | null
  goalId?: string | null
  status?: string
  scheduledAt?: string | null
  createdAt?: string
}

export interface TodayTask extends InboxTask {
  scheduledAt: string | null
  completedAt?: string | null
}

export interface CapacityMeter {
  currentEnergy: EnergyLevel
  scheduledMinutesByEnergy: Record<EnergyLevel, number>
  budgetMinutesByEnergy: Record<EnergyLevel, number>
  totalScheduledMinutes: number
  totalBudgetMinutes: number
}

export interface TodayView {
  todayDate: string
  currentHour: number
  currentEnergy: EnergyLevel
  hourMap: Record<number, EnergyLevel>
  todayTasks: TodayTask[]
  capacity: CapacityMeter
  inbox: {
    matchedToCurrentEnergy: InboxTask[]
    deferredLowEnergy: InboxTask[]
  }
}

export interface InboxResponse {
  count: number
  tasks: InboxTask[]
  byEnergy: Record<EnergyLevel, InboxTask[]>
}

export const ENERGY_COLORS: Record<EnergyLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
}

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  green: 'Peak',
  yellow: 'Steady',
  red: 'Low',
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#6b7280',
}

export function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
