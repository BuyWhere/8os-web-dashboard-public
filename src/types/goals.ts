export type GoalDomain = 'Career' | 'Wealth' | 'Health' | 'Relationships' | 'Learning' | 'Legacy';

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export interface Project {
  id: string;
  name: string;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  deadline?: string;
  status: ProjectStatus;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignee?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  userId?: string;
}

export interface GoalDetail extends Goal {
  definition: string;
  checkMethod: string;
  projects: Project[];
}

export interface Goal {
  id: string;
  name: string;
  domain: GoalDomain;
  progress: number;
  timeSpentThisWeek: number;
  streak: number;
  nextMilestone: string;
  nextMilestoneDue?: string;
  color: string;
}

export interface GoalCardProps {
  goal: Goal;
  onAddTask?: (goalId: string) => void;
  onViewProjects?: (goalId: string) => void;
  onLogActivity?: (goalId: string) => void;
}

export const DOMAIN_COLORS: Record<GoalDomain, string> = {
  Career: '#3b82f6',
  Wealth: '#eab308',
  Health: '#22c55e',
  Relationships: '#a855f7',
  Learning: '#f97316',
  Legacy: '#14b8a6',
};

export type EnergyAlignment = 'optimal' | 'okay' | 'off-peak';

export type FocusTaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export interface FocusTask {
  id: string;
  title: string;
  goalId: string;
  goalName: string;
  goalDomain: GoalDomain;
  energyAlignment: EnergyAlignment;
  scheduledTime: string;
  duration: number;
  completed: boolean;
  projectName?: string;
}

export interface TodaysFocusPanelProps {
  tasks: FocusTask[];
  isLoading?: boolean;
  onCompleteTask?: (taskId: string) => void;
  onRescheduleTask?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}