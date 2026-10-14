-- Existing tasks become projects; their IDs and records stay intact.
ALTER TABLE "tasks" ADD COLUMN "parentId" TEXT;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "tasks_userId_parentId_idx" ON "tasks"("userId", "parentId");
ALTER TABLE "pomodoro_sessions" ADD COLUMN "workProjectId" TEXT, ADD COLUMN "taskRecordId" TEXT, ADD COLUMN "projectName" TEXT;
CREATE INDEX "pomodoro_sessions_workProjectId_status_completedAt_idx" ON "pomodoro_sessions"("workProjectId", "status", "completedAt");
-- Historical sessions only recorded titles. Resolve duplicate titles consistently
-- to the oldest project, so each session is counted once.
UPDATE "pomodoro_sessions" s SET "workProjectId" = t."id", "projectName" = t."title"
FROM (SELECT DISTINCT ON ("userId", "title") "id", "userId", "title" FROM "tasks" ORDER BY "userId", "title", "createdAt", "id") t
WHERE s."userId" = t."userId" AND s."task" = t."title" AND s."type" IN ('WORK', 'TIME_TRACKING');
