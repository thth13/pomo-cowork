import { Prisma } from '@prisma/client'

const sessionColumn = (tableAlias: string, column: string) =>
  Prisma.raw(`"${tableAlias}"."${column}"`)

export const getEffectiveSessionMinutesSql = (tableAlias: string) => {
  const duration = sessionColumn(tableAlias, 'duration')
  const remainingSeconds = sessionColumn(tableAlias, 'remainingSeconds')
  const startedAt = sessionColumn(tableAlias, 'startedAt')
  const endedAt = sessionColumn(tableAlias, 'endedAt')
  const completedAt = sessionColumn(tableAlias, 'completedAt')
  const pausedAt = sessionColumn(tableAlias, 'pausedAt')
  const type = sessionColumn(tableAlias, 'type')
  const status = sessionColumn(tableAlias, 'status')

  return Prisma.sql`
    CASE
      -- Stopped trackers store elapsed duration. Legacy rows also retain the
      -- remaining seconds of the original 24-hour countdown (see getEffectiveMinutes).
      WHEN ${type} = 'TIME_TRACKING' AND ${status} = 'CANCELLED'
        AND (${remainingSeconds} = 0 OR (
          ${remainingSeconds} > 0
          AND ABS(${duration} * 60 + ${remainingSeconds} - 86400) <= 30
        ))
      THEN GREATEST(0, ${duration})
      WHEN ${remainingSeconds} IS NOT NULL
        AND ${remainingSeconds} >= 0
        AND ${remainingSeconds} <= ${duration} * 60
      THEN
        CASE
          WHEN ${duration} * 60 - ${remainingSeconds} > 0
            AND ROUND((${duration} * 60 - ${remainingSeconds}) / 60.0) = 0
          THEN 1
          ELSE GREATEST(
            0,
            ROUND((${duration} * 60 - ${remainingSeconds}) / 60.0)
          )::integer
        END
      WHEN COALESCE(${completedAt}, ${endedAt}) IS NOT NULL
      THEN
        LEAST(
          GREATEST(0, ${duration}),
          CASE
            WHEN EXTRACT(
              EPOCH FROM (
                CASE
                  WHEN ${pausedAt} IS NOT NULL
                    AND ${pausedAt} < COALESCE(${completedAt}, ${endedAt})
                  THEN ${pausedAt}
                  ELSE COALESCE(${completedAt}, ${endedAt})
                END - ${startedAt}
              )
            ) > 0
              AND ROUND(
                EXTRACT(
                  EPOCH FROM (
                    CASE
                      WHEN ${pausedAt} IS NOT NULL
                        AND ${pausedAt} < COALESCE(${completedAt}, ${endedAt})
                      THEN ${pausedAt}
                      ELSE COALESCE(${completedAt}, ${endedAt})
                    END - ${startedAt}
                  )
                ) / 60.0
              ) = 0
            THEN 1
            ELSE GREATEST(
              0,
              ROUND(
                EXTRACT(
                  EPOCH FROM (
                    CASE
                      WHEN ${pausedAt} IS NOT NULL
                        AND ${pausedAt} < COALESCE(${completedAt}, ${endedAt})
                      THEN ${pausedAt}
                      ELSE COALESCE(${completedAt}, ${endedAt})
                    END - ${startedAt}
                  )
                ) / 60.0
              )
            )::integer
          END
        )
      ELSE GREATEST(0, ${duration})
    END
  `
}
