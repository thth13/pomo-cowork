import {
  buildStudyPlan,
  validatePlannerInput,
  type PlannerInput,
  type PlannerMode,
} from './studyPlanner'

export interface PlannerDraft {
  startDate: string
  deadline: string
  availableMinutes: string
  workMinutes: string
  breakMinutes: string
  weekdays: number[]
  topics: Array<{ id: string; name: string; sessions: string }>
}

export interface PlannerSnapshot {
  draft: PlannerDraft
  committed: PlannerInput | null
  completed: string[]
}

const INPUT_KEYS = ['startDate', 'deadline', 'availableMinutes', 'workMinutes', 'breakMinutes', 'weekdays', 'topics']
const TOPIC_KEYS = ['id', 'name', 'sessions']
const MAX_SNAPSHOT_LENGTH = 200_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length
    && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

function isBoundedString(value: unknown, length: number): value is string {
  return typeof value === 'string' && value.length <= length
}

// Keep HTML number notation (including exponents) and unfinished edits intact.
// Numeric validity belongs to the planner engine when the draft is submitted.
function isNumericDraft(value: unknown): value is string {
  return isBoundedString(value, 64)
}

function isWeekdays(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= 7
    && value.every(day => Number.isInteger(day) && day >= 0 && day <= 6)
    && new Set(value).size === value.length
}

export function isPlannerDraft(value: unknown): value is PlannerDraft {
  if (!isRecord(value) || !hasExactKeys(value, INPUT_KEYS)) return false
  return isBoundedString(value.startDate, 10)
    && isBoundedString(value.deadline, 10)
    && isNumericDraft(value.availableMinutes)
    && isNumericDraft(value.workMinutes)
    && isNumericDraft(value.breakMinutes)
    && isWeekdays(value.weekdays)
    && Array.isArray(value.topics)
    && value.topics.length <= 12
    && value.topics.every(topic => isRecord(topic)
      && hasExactKeys(topic, TOPIC_KEYS)
      && isBoundedString(topic.id, 120)
      && isBoundedString(topic.name, 120)
      && isNumericDraft(topic.sessions))
}

export function toPlannerDraft(input: PlannerInput): PlannerDraft {
  return {
    startDate: input.startDate,
    deadline: input.deadline,
    availableMinutes: String(input.availableMinutes),
    workMinutes: String(input.workMinutes),
    breakMinutes: String(input.breakMinutes),
    weekdays: [...input.weekdays],
    topics: input.topics.map(topic => ({ ...topic, sessions: String(topic.sessions) })),
  }
}

function draftNumber(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value)
}

export function fromPlannerDraft(draft: PlannerDraft): PlannerInput {
  return {
    startDate: draft.startDate,
    deadline: draft.deadline,
    availableMinutes: draftNumber(draft.availableMinutes),
    workMinutes: draftNumber(draft.workMinutes),
    breakMinutes: draftNumber(draft.breakMinutes),
    weekdays: [...draft.weekdays],
    topics: draft.topics.map(topic => ({ ...topic, sessions: draftNumber(topic.sessions) })),
  }
}

function isCommittedInput(value: unknown): value is PlannerInput {
  if (!isRecord(value) || !hasExactKeys(value, INPUT_KEYS)) return false
  if (!isBoundedString(value.startDate, 10) || !isBoundedString(value.deadline, 10)
    || typeof value.availableMinutes !== 'number' || !Number.isFinite(value.availableMinutes)
    || typeof value.workMinutes !== 'number' || !Number.isFinite(value.workMinutes)
    || typeof value.breakMinutes !== 'number' || !Number.isFinite(value.breakMinutes)
    || !isWeekdays(value.weekdays)
    || !Array.isArray(value.topics) || value.topics.length > 12
    || !value.topics.every(topic => isRecord(topic)
      && hasExactKeys(topic, TOPIC_KEYS)
      && isBoundedString(topic.id, 120)
      && isBoundedString(topic.name, 120)
      && typeof topic.sessions === 'number' && Number.isFinite(topic.sessions))) return false

  return Object.keys(validatePlannerInput(value as unknown as PlannerInput)).length === 0
}

/** A malformed or obsolete saved value must never prevent the planner opening. */
export function parsePlannerSnapshot(raw: string): PlannerSnapshot | null {
  if (typeof raw !== 'string' || raw.length > MAX_SNAPSHOT_LENGTH) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || !hasExactKeys(value, ['draft', 'committed', 'completed'])
      || !isPlannerDraft(value.draft)
      || (value.committed !== null && !isCommittedInput(value.committed))
      || !Array.isArray(value.completed) || value.completed.length > 1_200
      || !value.completed.every(id => isBoundedString(id, 2_048))) return null

    const committed = value.committed as PlannerInput | null
    const sessionIds = new Set(committed
      ? buildStudyPlan(committed).days.flatMap(day => day.sessions.map(session => session.id))
      : [])
    const completed = Array.from(new Set((value.completed as string[]).filter(id => sessionIds.has(id))))
    return { draft: value.draft, committed, completed }
  } catch {
    return null
  }
}

export function plannerStorageKey(mode: PlannerMode): string {
  return `pomo:planner:v1:${mode}`
}

export function serializePlannerSnapshot(snapshot: PlannerSnapshot): string {
  return JSON.stringify(snapshot)
}

function safeTopicCell(value: string): string {
  // CSV quoting alone does not prevent spreadsheets from interpreting formulas.
  return /^[=+\-@\s\u0000-\u001f\u007f]/.test(value) ? `'${value}` : value
}

function csvRow(values: Array<string | number>): string {
  return values.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
}

export function plannerCsv(input: PlannerInput, completed: string[]): string {
  const plan = buildStudyPlan(input)
  const completedIds = new Set(completed)
  const topicSequences = new Map<string, number>()
  const rows: Array<Array<string | number>> = [[
    'Date', 'Topic', 'Session number', 'Focus minutes', 'Break-after minutes', 'Completion', 'Unscheduled sessions',
  ]]

  for (const day of plan.days) {
    day.sessions.forEach((session, index) => {
      const sequence = (topicSequences.get(session.topicId) ?? 0) + 1
      topicSequences.set(session.topicId, sequence)
      rows.push([
        day.date,
        safeTopicCell(session.topicName),
        sequence,
        session.minutes,
        index < day.sessions.length - 1 ? input.breakMinutes : 0,
        completedIds.has(session.id) ? 'Completed' : 'Planned',
        0,
      ])
    })
  }

  for (const topic of plan.unallocatedTopics) {
    rows.push([
      '', safeTopicCell(topic.name), '', topic.sessions * input.workMinutes, '', 'Unscheduled', topic.sessions,
    ])
  }

  return rows.map(csvRow).join('\r\n') + '\r\n'
}
