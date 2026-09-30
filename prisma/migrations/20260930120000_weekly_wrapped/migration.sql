CREATE TABLE "weekly_wrapped" (
  "userId" TEXT NOT NULL,
  "weekStart" VARCHAR(10) NOT NULL,
  "timezone" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "viewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "weekly_wrapped_pkey" PRIMARY KEY ("userId", "weekStart"),
  CONSTRAINT "weekly_wrapped_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Expression index for the shared completion-day weekly cohort aggregation.
CREATE INDEX "pomodoro_sessions_wrapped_completion_idx"
ON "pomodoro_sessions" (COALESCE("completedAt", "endedAt"))
WHERE "type" IN ('WORK', 'TIME_TRACKING')
  AND ("status" = 'COMPLETED' OR ("type" = 'TIME_TRACKING' AND "status" = 'CANCELLED'));
