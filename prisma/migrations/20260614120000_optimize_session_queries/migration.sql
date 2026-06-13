CREATE INDEX "pomodoro_sessions_status_startedAt_idx"
ON "pomodoro_sessions"("status", "startedAt");

CREATE INDEX "pomodoro_sessions_userId_createdAt_idx"
ON "pomodoro_sessions"("userId", "createdAt");

CREATE INDEX "pomodoro_sessions_userId_status_startedAt_idx"
ON "pomodoro_sessions"("userId", "status", "startedAt");

CREATE INDEX "pomodoro_sessions_attribution_idx"
ON "pomodoro_sessions"(
  "status",
  "type",
  (COALESCE("completedAt", "endedAt", "startedAt"))
);

CREATE INDEX "tasks_userId_completed_createdAt_idx"
ON "tasks"("userId", "completed", "createdAt");
