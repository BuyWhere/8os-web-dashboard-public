/**
 * Assistant Tool Definitions for OS Manipulation
 * These tools allow the AI assistant to read/write goals, projects, tasks, calendar, and archetype config.
 */

import { Tool } from './flow-ai'

/**
 * System prompt for the assistant
 */
export const ASSISTANT_SYSTEM_PROMPT = `You are the 8OS AI Assistant, a personalized life planning and organization helper.

You help users manage their operating system (OS) for life. This includes:
- Goals across life domains (career, wealth, health, relationships, learning, legacy)
- Projects that break down goals into actionable initiatives
- Tasks that break down projects into daily actions
- Calendar events for scheduling and time management
- Archetype-based recommendations tailored to their personality

Key behaviors:
- Be proactive, suggest improvements and next steps
- Reference the user's archetype when giving advice
- Help them stay on track with their goals
- Be concise but warm in responses
- When asked to make changes, use the appropriate tools, actually DO the work, don't just describe it.

Goal vs task, pick the right one:
- A GOAL is an outcome pursued over weeks to years through many actions ("get promoted", "run a marathon", "save $20k", "read more"). Use create_goal.
- A TASK is a single concrete action finished in one sitting, usually dated ("email my manager", "book the flight", "run 5k tomorrow"). Use create_task, attaching it to a fitting goal via goalId when one already exists.
- Something task-shaped that clearly serves a larger ongoing aim with no matching goal yet: create_goal for the theme first, then create_task under it. Otherwise just create the task.
- When it is genuinely ambiguous, ask one short clarifying question instead of guessing.

When you create a goal, set its shape so it lands in the right place:
- horizon = how far out the outcome sits: weekly, monthly, quarterly, yearly, three_year, five_year. "This week/month" aims map to weekly/monthly; life aims to three_year/five_year; default to yearly if unclear. Goals are grouped by horizon in the Goals view, so this keeps near-term and long-term separated.
- checkMethod = how progress is judged: numeric/time/streak for measurable goals, milestone for staged goals, and binary for goals that cannot be measured with a number (subjective or habit-of-being aims like "be more patient" or "be a better listener"). A binary goal becomes a simple yes/no accountability check-in instead of a progress bar, so the user is still held to untrackable intentions.

You can complete multi-step requests in a single turn. When the user asks for something like "create a goal to run a marathon and schedule its first task", carry out the WHOLE chain of tools before replying:
  1. create_goal (returns a goalId)
  2. create_task with that goalId for a concrete first action (you may pass suggestedSchedule to schedule it in one step, which also creates the calendar event), OR
  3. schedule_task with the returned taskId to place it on the calendar.
Always thread the ids returned by one tool into the next tool. Do not stop after the first tool if the request implies more steps. Only stop when the user's request is fully satisfied, then summarize what you created (goal, task, and the calendar time).

When you use a tool, briefly explain what you're doing. After making changes, summarize concretely what was created.`

/**
 * Build a personalized system prompt using the user's OS config
 */
export function buildPersonalizedPrompt(osConfig: Record<string, any>): string {
  const archetype = osConfig.archetypeName || osConfig.archetype
  const baziElement = osConfig.bazi?.element || osConfig.baziElement
  const tone = osConfig.tone
  const energyHours = osConfig.energyHours
  const workflow = osConfig.workflowDescription

  let prompt = ASSISTANT_SYSTEM_PROMPT

  if (archetype) {
    prompt += `\n\n## User's Archetype: ${archetype}`
    if (baziElement) {
      prompt += `\nBaZi Element: ${baziElement}`
    }
    if (tone) {
      prompt += `\nTone: ${tone}`
    }
    if (workflow) {
      prompt += `\nPreferred workflow: ${workflow}`
    }
  }

  if (energyHours && typeof energyHours === 'object') {
    const peaks = Object.entries(energyHours)
      .filter(([_, level]) => level === 'high' || level === 3)
      .map(([hour]) => `${hour}:00`)
    if (peaks.length > 0) {
      prompt += `\n\nPeak energy hours: ${peaks.join(', ')}. Schedule high-priority tasks during these times.`
    }
  }

  prompt += `\n\nYou have access to the user's goals, projects, tasks, calendar, and archetype config. Use the tools to read and modify their OS. Always reference their archetype when giving advice.`

  return prompt
}

/**
 * Tool definitions for the assistant
 */
export const ASSISTANT_TOOLS: Tool[] = [
  // Goals
  {
    type: 'function',
    function: {
      name: 'get_goals',
      description: 'Get all goals for the user, optionally filtered by domain',
      parameters: {
        type: 'object',
        properties: {
          domainId: {
            type: 'string',
            description: 'Optional domain filter: career, wealth, health, relationships, learning, legacy',
            enum: ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'],
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description:
        'Create a NEW goal for the user in one of the six life domains. Use this whenever the user asks to add/create/set a goal. After creating a goal you can create_task (pass the returned goalId) and schedule_task to put its first action on the calendar.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short goal name, e.g. "Run a marathon"' },
          definition: {
            type: 'string',
            description: 'One sentence describing what achieving this goal looks like. Defaults to the name if omitted.',
          },
          domainId: {
            type: 'string',
            description:
              'Life domain. If omitted it is inferred from the goal text. career, wealth, health, relationships, learning, legacy.',
            enum: ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'],
          },
          horizon: {
            type: 'string',
            description:
              'Time horizon of the outcome. Short aims → weekly/monthly; mid → quarterly/yearly; life aims → three_year/five_year. Defaults to yearly. Goals are grouped by horizon in the UI, which separates near-term from long-term.',
            enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'three_year', 'five_year'],
          },
          checkMethod: {
            type: 'string',
            description:
              'How progress is measured. Use numeric/time/streak for measurable goals, milestone for staged goals, and binary for goals that cannot be counted (subjective/habit-of-being aims) — binary becomes a yes/no accountability check-in. Defaults to milestone.',
            enum: ['binary', 'numeric', 'time', 'streak', 'milestone'],
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_goal',
      description: 'Update a goal definition, status, progress, or its check configuration',
      parameters: {
        type: 'object',
        properties: {
          goalId: {
            type: 'string',
            description: 'The goal ID to update',
          },
          updates: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Updated goal name' },
              definition: { type: 'string', description: 'Updated goal definition' },
              checkConfig: {
                type: 'object',
                properties: {
                  target: { type: 'number', description: 'Target value for numeric/streak goals' },
                  unit: { type: 'string', description: 'Unit for numeric/time goals' },
                },
              },
            },
          },
        },
        required: ['goalId'],
      },
    },
  },

  // Projects
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: 'Get all projects, optionally filtered by domain or goal',
      parameters: {
        type: 'object',
        properties: {
          domainId: {
            type: 'string',
            description: 'Optional domain filter',
            enum: ['career', 'wealth', 'health', 'relationships', 'learning', 'legacy'],
          },
          goalName: {
            type: 'string',
            description: 'Optional goal name filter',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Create a new project linked to a goal. Pass goalId (preferred, from create_goal/get_goals) or goalName.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          description: { type: 'string', description: 'Project description' },
          goalId: { type: 'string', description: 'The goal ID this project supports (preferred).' },
          goalName: { type: 'string', description: 'Goal name this project supports (used if goalId is absent).' },
          estimatedDuration: { type: 'string', description: 'e.g., "2 weeks", "1 month"' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_project',
      description: 'Update an existing project',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'The project ID' },
          updates: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              accepted: { type: 'boolean', description: 'Mark project as accepted' },
            },
          },
        },
        required: ['projectId'],
      },
    },
  },

  // Tasks
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Get tasks, optionally filtered by project, goal, or status',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Optional project filter' },
          goalId: { type: 'string', description: 'Optional goal filter' },
          status: { type: 'string', description: 'Optional status filter', enum: ['todo', 'in_progress', 'done', 'cancelled'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new actionable task. Link it to a goal (goalId, preferred) and/or a project (projectId). A task does NOT require a project. If you pass scheduledAt (ISO datetime) or suggestedSchedule ("tomorrow morning"/"afternoon"/"evening"), the task is scheduled AND a calendar event is created automatically.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name, e.g. "Go for a 3km run"' },
          goalId: { type: 'string', description: 'Goal this task advances (from create_goal/get_goals).' },
          goalName: { type: 'string', description: 'Goal name (used if goalId is absent).' },
          projectId: { type: 'string', description: 'Optional parent project ID' },
          duration: { type: 'string', description: 'Estimated duration, e.g., "30 min", "1h". Defaults to 60 min.' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority. Defaults to medium.' },
          scheduledAt: { type: 'string', description: 'ISO datetime to schedule the task (also creates a calendar event).' },
          suggestedSchedule: { type: 'string', description: 'Natural slot: "morning", "afternoon", "evening" (schedules for tomorrow).' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_task',
      description:
        'Schedule an EXISTING task onto the calendar, creating a calendar event and setting the task time. Use this to put a task on the calendar after create_task, or to (re)schedule any task.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task ID to schedule' },
          startTime: { type: 'string', description: 'ISO datetime, or a natural slot like "tomorrow morning". Defaults to tomorrow 9am.' },
        },
        required: ['taskId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as complete',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task ID to complete' },
        },
        required: ['taskId'],
      },
    },
  },

  // Calendar
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description: 'Get calendar events for a date range',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (ISO format)' },
          endDate: { type: 'string', description: 'End date (ISO format)' },
        },
        required: ['startDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          startTime: { type: 'string', description: 'Start time (ISO format)' },
          endTime: { type: 'string', description: 'End time (ISO format)' },
          description: { type: 'string', description: 'Event description' },
          taskId: { type: 'string', description: 'Optional linked task ID' },
        },
        required: ['title', 'startTime', 'endTime'],
      },
    },
  },

  // Archetype & OS Config
  {
    type: 'function',
    function: {
      name: 'get_archetype_info',
      description: 'Get the user archetype and OS configuration',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_energy_hours',
      description: 'Get the user energy level configuration for different hours of the day',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]
