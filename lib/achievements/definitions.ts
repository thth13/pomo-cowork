export const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic'] as const
export type AchievementRarity = typeof RARITIES[number]
export type AchievementCategory = 'focus' | 'sessions' | 'streak' | 'daily' | 'weekly' | 'projects' | 'tasks' | 'coworking' | 'leaderboard' | 'consistency' | 'secret'
export type AchievementMetric = 'focusHours' | 'sessions' | 'streak' | 'dayHours' | 'weekHours' | 'weekDays' | 'projectHours' | 'tasks' | 'sameTask' | 'coworking' | 'peers' | 'rooms' | 'buddy' | 'rank' | 'champion' | 'consistentDays' | 'consistentWeeks' | 'night' | 'early' | 'christmas' | 'newYear' | 'awayDays' | 'uninterrupted' | 'oneMore'
export interface AchievementDefinition {
  id: string
  name: string
  nameEs: string
  description: string
  descriptionEs: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: AchievementCategory
  metric: AchievementMetric
  threshold: number
  unit: 'hours' | 'sessions' | 'days' | 'weeks' | 'tasks' | 'users' | 'rank' | 'count'
  secret?: boolean
  enabled?: boolean
}
type Step = [id: string, name: string, nameEs: string, threshold: number, rarity: AchievementRarity]
function series(category: AchievementCategory, metric: AchievementMetric, unit: AchievementDefinition['unit'], describe: (n: number) => [string, string], steps: Step[]): AchievementDefinition[] {
  return steps.map(([id, name, nameEs, threshold, rarity]) => {
    const [description, descriptionEs] = describe(threshold)
    return { id, name, nameEs, threshold, rarity, category, metric, unit, icon: category, description, descriptionEs }
  })
}
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...series('focus', 'focusHours', 'hours', n => [`Focus for ${n.toLocaleString('en-US')} hours in total.`, `Acumula ${n.toLocaleString('es-ES')} horas de concentración.`], [
    ['focused', 'Focused', 'Concentración', 5, 'common'],
    ['getting-serious', 'Getting Serious', 'Esto va en serio', 10, 'common'],
    ['deep-worker', 'Deep Worker', 'Trabajo profundo', 25, 'rare'],
    ['focus-machine', 'Focus Machine', 'Máquina de concentración', 50, 'rare'],
    ['century-club', 'Century Club', 'Club de las cien horas', 100, 'epic'],
    ['locked-in', 'Locked In', 'Concentración total', 250, 'epic'],
    ['focus-veteran', 'Focus Veteran', 'Veterano del enfoque', 500, 'legendary'],
    ['master-of-focus', 'Master of Focus', 'Maestro del enfoque', 1000, 'legendary'],
    ['legend', 'Legend', 'Leyenda', 2500, 'mythic'],
    ['unstoppable', 'Unstoppable', 'Imparable', 5000, 'mythic'],
  ]),
  ...series('sessions', 'sessions', 'sessions', n => [`Complete ${n.toLocaleString('en-US')} Pomodoro focus sessions.`, `Completa ${n.toLocaleString('es-ES')} sesiones de concentración Pomodoro.`], [
    ['tomato-rookie', 'Tomato Rookie', 'Primeros tomates', 10, 'common'],
    ['tomato-collector', 'Tomato Collector', 'Coleccionista de tomates', 50, 'common'],
    ['pomodoro-pro', 'Pomodoro Pro', 'Profesional del Pomodoro', 100, 'rare'],
    ['tomato-factory', 'Tomato Factory', 'Fábrica de tomates', 500, 'epic'],
    ['pomodoro-master', 'Pomodoro Master', 'Maestro del Pomodoro', 1000, 'legendary'],
    ['ten-thousand-tomatoes', 'Ten Thousand Tomatoes', 'Diez mil tomates', 10000, 'mythic'],
  ]),
  ...series('streak', 'streak', 'days', n => [`Focus for at least 25 minutes on ${n} consecutive days.`, `Concéntrate al menos 25 minutos durante ${n} días seguidos.`], [
    ['on-fire', 'On Fire', 'En racha', 3, 'common'], ['one-week-strong', 'One Week Strong', 'Una semana firme', 7, 'common'],
    ['two-weeks-locked-in', 'Two Weeks Locked In', 'Dos semanas a fondo', 14, 'rare'], ['habit-formed', 'Habit Formed', 'Hábito adquirido', 30, 'epic'],
    ['unbreakable', 'Unbreakable', 'Inquebrantable', 60, 'epic'], ['100-days', '100 Days', '100 días', 100, 'legendary'],
    ['half-year-grind', 'Half-Year Grind', 'Medio año de constancia', 180, 'legendary'], ['year-of-focus', 'Year of Focus', 'Un año de enfoque', 365, 'mythic'],
  ]),
  ...series('daily', 'dayHours', 'hours', n => [`Complete ${n} focus hours in one day.`, `Completa ${n} horas de concentración en un día.`], [
    ['good-day', 'Good Day', 'Un buen día', 2, 'common'], ['deep-work-day', 'Deep Work Day', 'Día de trabajo profundo', 4, 'rare'],
    ['focus-marathon', 'Focus Marathon', 'Maratón de concentración', 6, 'epic'], ['absolute-machine', 'Absolute Machine', 'Rendimiento excepcional', 8, 'legendary'],
  ]),
  ...series('weekly', 'weekHours', 'hours', n => [`Complete ${n} focus hours in a Monday–Sunday week.`, `Completa ${n} horas de concentración en una semana de lunes a domingo.`], [
    ['strong-week', 'Strong Week', 'Una gran semana', 10, 'common'], ['productive-week', 'Productive Week', 'Semana productiva', 20, 'rare'],
    ['deep-work-week', 'Deep Work Week', 'Semana de trabajo profundo', 30, 'epic'], ['elite-week', 'Elite Week', 'Semana excepcional', 40, 'legendary'],
  ]),
  ...series('weekly', 'weekDays', 'days', () => ['Complete a focus session on all seven days of one week.', 'Completa una sesión de concentración cada día de una misma semana.'], [['perfect-week', 'Perfect Week', 'Semana perfecta', 7, 'epic']]),
  ...series('projects', 'projectHours', 'hours', n => [`Focus for ${n} hours on a single project.`, `Dedica ${n} horas de concentración a un mismo proyecto.`], [
    ['first-milestone', 'First Milestone', 'Primer hito', 5, 'common'], ['committed', 'Committed', 'Compromiso', 25, 'rare'],
    ['building-something', 'Building Something', 'Construyendo algo', 50, 'rare'], ['serious-project', 'Serious Project', 'Un proyecto serio', 100, 'epic'],
    ['long-term-builder', 'Long-Term Builder', 'Construyendo a largo plazo', 500, 'legendary'],
  ]),
  ...series('tasks', 'tasks', 'tasks', n => [`Complete ${n} tasks.`, `Completa ${n} tareas.`], [
    ['getting-things-done', 'Getting Things Done', 'Haciendo las cosas', 10, 'common'], ['task-crusher', 'Task Crusher', 'Tareas resueltas', 50, 'rare'],
    ['execution-machine', 'Execution Machine', 'De la idea a la acción', 100, 'epic'], ['500-down', '500 Down', '500 menos', 500, 'legendary'],
    ['done-means-done', 'Done Means Done', 'Hecho es hecho', 1000, 'mythic'],
  ]),
  ...series('tasks', 'sameTask', 'sessions', () => ['Complete 10 consecutive Pomodoros on the same task.', 'Completa 10 Pomodoros consecutivos en la misma tarea.'], [['one-thing-at-a-time', 'One Thing at a Time', 'Una cosa a la vez', 10, 'epic']]).map(d => ({ ...d, enabled: false })),
  ...series('coworking', 'coworking', 'sessions', n => [`Complete ${n} focus session${n === 1 ? '' : 's'} while someone else is focusing.`, `Completa ${n} sesiones de concentración mientras otra persona se concentra.`], [
    ['not-alone', 'Not Alone', 'En compañía', 1, 'common'], ['coworker', 'Coworker', 'Compañero de trabajo', 10, 'rare'],
  ]),
  ...series('coworking', 'peers', 'users', () => ['Complete a focus session while at least 10 other people are focusing.', 'Completa una sesión mientras al menos otras 10 personas se concentran.'], [['focus-together', 'Focus Together', 'Concentración compartida', 10, 'rare']]),
  ...series('coworking', 'rooms', 'sessions', n => [`Complete ${n} focus session${n === 1 ? '' : 's'} inside rooms.`, `Completa ${n} sesiones de concentración en salas.`], [
    ['roommate', 'Roommate', 'Compañero de sala', 1, 'common'], ['regular', 'Regular', 'Habitual', 25, 'rare'],
  ]),
  ...series('coworking', 'buddy', 'sessions', () => ['Complete 10 focus sessions alongside the same person.', 'Completa 10 sesiones de concentración junto a la misma persona.'], [['focus-buddy', 'Focus Buddy', 'Compañero de enfoque', 10, 'epic']]),
  ...series('leaderboard', 'rank', 'rank', n => [`Reach weekly rank #${n} or higher with positive focus time.`, `Alcanza el puesto semanal ${n} o superior con tiempo de concentración.`], [
    ['top-100', 'Top 100', 'Top 100', 100, 'common'], ['top-50', 'Top 50', 'Top 50', 50, 'rare'],
    ['top-10', 'Top 10', 'Top 10', 10, 'epic'], ['podium', 'Podium', 'Podio', 3, 'legendary'], ['number-one', '#1', 'N.º 1', 1, 'legendary'],
  ]),
  ...series('leaderboard', 'champion', 'count', () => ['Finish a completed calendar week at rank #1.', 'Termina una semana natural en el primer puesto.'], [['champion', 'Champion', 'Campeón', 1, 'mythic']]),
  ...series('consistency', 'consistentDays', 'days', n => [`Complete at least one focus hour a day for ${n} consecutive days.`, `Completa al menos una hora de concentración al día durante ${n} días seguidos.`], [
    ['consistent', 'Consistent', 'Constante', 5, 'common'], ['very-consistent', 'Very Consistent', 'Muy constante', 14, 'rare'], ['daily-discipline', 'Daily Discipline', 'Disciplina diaria', 30, 'legendary'],
  ]),
  ...series('consistency', 'consistentWeeks', 'weeks', () => ['Complete at least 5 focus hours in each of 4 consecutive calendar weeks.', 'Completa al menos 5 horas de concentración por semana durante 4 semanas naturales seguidas.'], [['no-zero-weeks', 'No Zero Weeks', 'Ninguna semana en blanco', 4, 'epic']]),
  ...([
    ['night-owl', 'Night Owl', 'Búho nocturno', 'night', 1, 'rare', 'Complete a focus session between midnight and 04:00.', 'Completa una sesión entre medianoche y las 04:00.'],
    ['early-bird', 'Early Bird', 'Madrugador', 'early', 1, 'rare', 'Complete a focus session before 07:00.', 'Completa una sesión antes de las 07:00.'],
    ['christmas-grind', 'Christmas Grind', 'Enfoque navideño', 'christmas', 1, 'rare', 'Complete a focus session on December 25.', 'Completa una sesión el 25 de diciembre.'],
    ['new-year-same-grind', 'New Year, Same Grind', 'Año nuevo, mismo enfoque', 'newYear', 1, 'rare', 'Complete a focus session on January 1.', 'Completa una sesión el 1 de enero.'],
    ['back-again', 'Back Again', 'De vuelta', 'awayDays', 30, 'rare', 'Complete a focus session after at least 30 days without focus activity.', 'Completa una sesión tras al menos 30 días sin actividad de concentración.'],
    ['long-time-no-see', 'Long Time No See', 'Cuánto tiempo', 'awayDays', 100, 'epic', 'Complete a focus session after at least 100 days without focus activity.', 'Completa una sesión tras al menos 100 días sin actividad de concentración.'],
    ['perfect-timing', 'Perfect Timing', 'Ritmo perfecto', 'uninterrupted', 4, 'rare', 'Complete 4 consecutive focus sessions without cancelling or resetting.', 'Completa 4 sesiones seguidas sin cancelar ni reiniciar.'],
    ['no-distractions', 'No Distractions', 'Sin distracciones', 'uninterrupted', 10, 'epic', 'Complete 10 consecutive focus sessions without abandoning or cancelling.', 'Completa 10 sesiones seguidas sin abandonar ni cancelar.'],
    ['just-one-more', 'Just One More', 'Solo una más', 'oneMore', 1, 'rare', 'Start a focus session within 60 seconds after a completed break.', 'Inicia una sesión de concentración en los 60 segundos siguientes al final de un descanso.'],
  ] satisfies [string, string, string, AchievementMetric, number, AchievementRarity, string, string][]).map(([id, name, nameEs, metric, threshold, rarity, description, descriptionEs]): AchievementDefinition => ({
    id, name, nameEs, metric, threshold, rarity, description, descriptionEs, secret: true, category: 'secret', icon: 'secret', unit: 'count',
  })),
]
export const ENABLED_ACHIEVEMENTS = ACHIEVEMENTS.filter(d => d.enabled !== false)
export type AchievementMetrics = Partial<Record<AchievementMetric, number>>
export function isEarned(definition: AchievementDefinition, metrics: AchievementMetrics) {
  const value = metrics[definition.metric] ?? 0
  return definition.enabled !== false && (definition.metric === 'rank' ? value > 0 && value <= definition.threshold : value >= definition.threshold)
}
export interface AchievementView {
  id: string
  category: AchievementCategory
  rarity: AchievementRarity
  icon: AchievementCategory
  name: string
  nameEs: string
  description: string
  descriptionEs: string
  secret: boolean
  threshold: number | null
  unit: AchievementDefinition['unit']
  progress: number | null
  unlockedAt: string | null
  percentage: number | null
}
export interface AchievementProfile { items: AchievementView[]; evaluatedAt: string | null }
