export type PlannerMode = 'weekly' | 'exam' | 'calculator'

export interface PlannerTopic {
  id: string
  name: string
  sessions: number
}

export interface PlannerInput {
  startDate: string
  deadline: string
  availableMinutes: number
  workMinutes: number
  breakMinutes: number
  /** JavaScript weekday numbers: Sunday is 0, Saturday is 6. */
  weekdays: number[]
  topics: PlannerTopic[]
}

export interface PlannedSession {
  id: string
  topicId: string
  topicName: string
  minutes: number
}

export interface PlannedDay {
  date: string
  sessions: PlannedSession[]
  focusMinutes: number
  breakMinutes: number
  totalMinutes: number
}

export interface StudyPlan {
  days: PlannedDay[]
  requestedSessions: number
  scheduledSessions: number
  unscheduledSessions: number
  availableDays: number
  dailyCapacity: number
  unallocatedTopics: PlannerTopic[]
}

export interface PomodoroCalculation {
  sessions: number
  focusMinutes: number
  breakMinutes: number
  totalMinutes: number
  unusedMinutes: number
}

export interface PlannerTemplate {
  title: string
  description: string
  durationDays: number
  availableMinutes: number
  workMinutes: number
  breakMinutes: number
  weekdays: number[]
  topics: PlannerTopic[]
}

export type PlannerFieldErrors = Record<string, string>

export class PlannerValidationError extends Error {
  readonly errors: PlannerFieldErrors

  constructor(errors: PlannerFieldErrors) {
    super('Please correct the highlighted planner fields.')
    this.name = 'PlannerValidationError'
    this.errors = errors
    Object.setPrototypeOf(this, PlannerValidationError.prototype)
  }
}

const DAY_MS = 24 * 60 * 60 * 1000
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

/** Parse a civil date without involving the browser's timezone or DST. */
function parseDateKey(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null

  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null

  // setUTCFullYear preserves years 1–99, unlike Date.UTC's special handling.
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? date
    : null
}

function utcDateKey(date: Date): string {
  const year = date.getUTCFullYear()
  if (!Number.isFinite(date.getTime()) || year < 1 || year > 9999) {
    throw new RangeError('Use a date between 0001-01-01 and 9999-12-31.')
  }
  return `${String(year).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/** Read today's date in the user's local timezone, without converting to UTC. */
export function dateKeyLocal(date: Date): string {
  const year = date.getFullYear()
  if (!Number.isFinite(date.getTime()) || year < 1 || year > 9999) {
    throw new RangeError('Use a valid date between years 1 and 9999.')
  }
  return `${String(year).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  if (!date || !Number.isInteger(days)) {
    throw new RangeError('Use a valid YYYY-MM-DD date and a whole number of days.')
  }
  date.setUTCDate(date.getUTCDate() + days)
  return utcDateKey(date)
}

function validateTiming(availableMinutes: number, workMinutes: number, breakMinutes: number): PlannerFieldErrors {
  const errors: PlannerFieldErrors = {}
  if (!Number.isInteger(availableMinutes) || availableMinutes < 15 || availableMinutes > 480) {
    errors.availableMinutes = 'Enter 15–480 whole minutes of available time.'
  }
  if (!Number.isInteger(workMinutes) || workMinutes < 5 || workMinutes > 90) {
    errors.workMinutes = 'Choose a focus session of 5–90 whole minutes.'
  }
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 30) {
    errors.breakMinutes = 'Choose a break of 0–30 whole minutes.'
  }
  return errors
}

export function validatePlannerInput(input: PlannerInput): PlannerFieldErrors {
  if (!input || typeof input !== 'object') return { planner: 'Enter your study plan details.' }

  const errors = validateTiming(input.availableMinutes, input.workMinutes, input.breakMinutes)
  const start = parseDateKey(input.startDate)
  const deadline = parseDateKey(input.deadline)

  if (!start) errors.startDate = 'Choose a valid start date.'
  if (!deadline) errors.deadline = 'Choose a valid deadline.'

  let rangeDays = 0
  if (start && deadline) {
    rangeDays = (deadline.getTime() - start.getTime()) / DAY_MS + 1
    if (rangeDays < 1) errors.deadline = 'The deadline must be on or after the start date.'
    else if (rangeDays > 90) errors.deadline = 'Choose a date range of 90 days or fewer.'
  }

  if (!Array.isArray(input.weekdays) || input.weekdays.length === 0
    || Array.from(input.weekdays).some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    errors.weekdays = 'Choose at least one valid study day.'
  } else if (start && rangeDays >= 1 && rangeDays <= 90) {
    const hasAvailableDay = Array.from({ length: rangeDays }, (_, index) =>
      (start.getUTCDay() + index) % 7,
    ).some(day => input.weekdays.includes(day))
    if (!hasAvailableDay) errors.weekdays = 'No selected study days fall within these dates.'
  }

  if (!Array.isArray(input.topics) || input.topics.length === 0 || input.topics.length > 12) {
    errors.topics = 'Add between 1 and 12 topics.'
  } else {
    const seenIds = new Set<string>()
    Array.from(input.topics).forEach((topic, index) => {
      if (!topic || typeof topic !== 'object') {
        errors.topics = 'Each topic needs a name and a session count.'
        return
      }
      const key = typeof topic.id === 'string' && topic.id ? topic.id : `index-${index}`
      if (typeof topic.id !== 'string' || !topic.id.trim() || topic.id.length > 120 || seenIds.has(topic.id)) {
        errors[`topic:${key}:id`] = 'Each topic needs a unique identifier.'
      } else {
        seenIds.add(topic.id)
      }
      if (typeof topic.name !== 'string' || !topic.name.trim() || topic.name.trim().length > 120) {
        errors[`topic:${key}:name`] = 'Enter a topic name of 1–120 characters.'
      }
      if (!Number.isInteger(topic.sessions) || topic.sessions < 1 || topic.sessions > 100) {
        errors[`topic:${key}:sessions`] = 'Choose 1–100 whole sessions for this topic.'
      }
    })
  }

  return errors
}

/** A break belongs between sessions; there is no break after the last one. */
export function calculatePomodoros(availableMinutes: number, workMinutes: number, breakMinutes: number): PomodoroCalculation {
  const errors = validateTiming(availableMinutes, workMinutes, breakMinutes)
  if (Object.keys(errors).length) throw new PlannerValidationError(errors)

  const sessions = Math.floor((availableMinutes + breakMinutes) / (workMinutes + breakMinutes))
  const focusMinutes = sessions * workMinutes
  const breaks = Math.max(0, sessions - 1) * breakMinutes
  const totalMinutes = focusMinutes + breaks
  return { sessions, focusMinutes, breakMinutes: breaks, totalMinutes, unusedMinutes: availableMinutes - totalMinutes }
}

export function buildStudyPlan(input: PlannerInput): StudyPlan {
  const errors = validatePlannerInput(input)
  if (Object.keys(errors).length) throw new PlannerValidationError(errors)

  // Date validation above guarantees these values. Iterate in UTC so daylight
  // saving changes never add, remove, or repeat a selected calendar day.
  const start = parseDateKey(input.startDate)!
  const deadline = parseDateKey(input.deadline)!
  const rangeDays = (deadline.getTime() - start.getTime()) / DAY_MS + 1
  const dates: string[] = []
  for (let index = 0; index < rangeDays; index += 1) {
    if (input.weekdays.includes((start.getUTCDay() + index) % 7)) {
      dates.push(addDays(input.startDate, index))
    }
  }

  const dailyCapacity = calculatePomodoros(input.availableMinutes, input.workMinutes, input.breakMinutes).sessions
  const requestedSessions = input.topics.reduce((sum, topic) => sum + topic.sessions, 0)
  const scheduledSessions = Math.min(requestedSessions, dates.length * dailyCapacity)
  const remaining = input.topics.map(topic => topic.sessions)
  let nextTopicIndex = 0

  const days = dates.map((date, dayIndex): PlannedDay => {
    // Divide the workload evenly across selected days. The cumulative ceiling
    // also spreads a small workload across the range, starting on the first day.
    const sessionCount = Math.ceil((dayIndex + 1) * scheduledSessions / dates.length)
      - Math.ceil(dayIndex * scheduledSessions / dates.length)
    const sessions: PlannedSession[] = []

    for (let index = 0; index < sessionCount; index += 1) {
      while (remaining[nextTopicIndex] === 0) {
        nextTopicIndex = (nextTopicIndex + 1) % input.topics.length
      }
      const topic = input.topics[nextTopicIndex]
      const sequence = topic.sessions - remaining[nextTopicIndex] + 1
      sessions.push({
        id: `${date}:${topic.id}:${sequence}`,
        topicId: topic.id,
        topicName: topic.name.trim(),
        minutes: input.workMinutes,
      })
      remaining[nextTopicIndex] -= 1
      nextTopicIndex = (nextTopicIndex + 1) % input.topics.length
    }

    const focusMinutes = sessionCount * input.workMinutes
    const breakMinutes = Math.max(0, sessionCount - 1) * input.breakMinutes
    return { date, sessions, focusMinutes, breakMinutes, totalMinutes: focusMinutes + breakMinutes }
  })

  return {
    days,
    requestedSessions,
    scheduledSessions,
    unscheduledSessions: requestedSessions - scheduledSessions,
    availableDays: dates.length,
    dailyCapacity,
    unallocatedTopics: input.topics.flatMap((topic, index) => remaining[index] > 0
      ? [{ id: topic.id, name: topic.name.trim(), sessions: remaining[index] }]
      : []),
  }
}

export const plannerTemplates: Record<PlannerMode, PlannerTemplate> = {
  weekly: {
    title: 'Weekly study plan',
    description: 'Balance three subjects across your study week.',
    durationDays: 7,
    availableMinutes: 90,
    workMinutes: 25,
    breakMinutes: 5,
    weekdays: [1, 2, 3, 4, 5],
    topics: [
      { id: 'mathematics', name: 'Mathematics', sessions: 4 },
      { id: 'biology', name: 'Biology', sessions: 4 },
      { id: 'history', name: 'History', sessions: 4 },
    ],
  },
  exam: {
    title: 'Two-week exam revision',
    description: 'Make room for key concepts, practice questions, and past papers.',
    durationDays: 14,
    availableMinutes: 60,
    workMinutes: 25,
    breakMinutes: 5,
    weekdays: [...ALL_WEEKDAYS],
    topics: [
      { id: 'concepts', name: 'Review key concepts', sessions: 6 },
      { id: 'questions', name: 'Practice questions', sessions: 6 },
      { id: 'past-papers', name: 'Past papers and corrections', sessions: 6 },
    ],
  },
  calculator: {
    title: 'Custom focus plan',
    description: 'Start with one task and adjust the time to fit your day.',
    durationDays: 1,
    availableMinutes: 120,
    workMinutes: 25,
    breakMinutes: 5,
    weekdays: [...ALL_WEEKDAYS],
    topics: [{ id: 'focus-task', name: 'My focus task', sessions: 4 }],
  },
}

export function createPlannerInput(mode: PlannerMode, todayKey: string): PlannerInput {
  if (!Object.prototype.hasOwnProperty.call(plannerTemplates, mode)) {
    throw new RangeError('Choose a weekly, exam, or calculator planner.')
  }
  const template = plannerTemplates[mode]
  return {
    startDate: addDays(todayKey, 0),
    deadline: addDays(todayKey, template.durationDays - 1),
    availableMinutes: template.availableMinutes,
    workMinutes: template.workMinutes,
    breakMinutes: template.breakMinutes,
    weekdays: [...template.weekdays],
    topics: template.topics.map(topic => ({ ...topic })),
  }
}
