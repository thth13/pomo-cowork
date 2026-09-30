CREATE TABLE "user_achievements" (
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "achievementId" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notifiedAt" TIMESTAMP(3),
  "featuredOrder" INTEGER,
  "metadata" JSONB,
  PRIMARY KEY ("userId", "achievementId"),
  CONSTRAINT "achievement_featured_range" CHECK ("featuredOrder" IS NULL OR "featuredOrder" BETWEEN 0 AND 2),
  UNIQUE ("userId", "featuredOrder")
);
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");
CREATE INDEX "user_achievements_userId_notifiedAt_idx" ON "user_achievements"("userId", "notifiedAt");

CREATE TABLE "achievement_state" (
  "userId" TEXT PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "version" INTEGER NOT NULL DEFAULT 1,
  "evaluatedVersion" INTEGER NOT NULL DEFAULT 0,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "evaluatedAt" TIMESTAMP(3)
);
CREATE TABLE "achievement_events" (
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "key" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "key")
);
CREATE INDEX "achievement_events_userId_createdAt_idx" ON "achievement_events"("userId", "createdAt");
CREATE TABLE "achievement_jobs" (
  "key" TEXT PRIMARY KEY,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "achievement_jobs" ("key") VALUES ('deployed');
CREATE TABLE "achievement_population" (
  "achievementId" TEXT PRIMARY KEY,
  "unlockedCount" INTEGER NOT NULL,
  "eligibleCount" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "pomodoro_sessions_achievement_history_idx"
  ON "pomodoro_sessions"("userId", "type", "status", "completedAt");

-- Persist events at the database boundary, including resets, deletions and
-- clients other than the browser. No network/aggregation work in completion.
CREATE FUNCTION record_achievement_activity() RETURNS TRIGGER AS $$
DECLARE
  owner_id TEXT;
  peers JSONB;
  old_break TIMESTAMP(3);
BEGIN
  IF TG_OP = 'DELETE' THEN owner_id := OLD."userId";
  ELSE owner_id := NEW."userId"; END IF;
  IF NOT EXISTS (SELECT 1 FROM "users" WHERE "id" = owner_id) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  INSERT INTO "achievement_state" ("userId") SELECT "id" FROM "users" WHERE "id" = owner_id
    ON CONFLICT ("userId") DO UPDATE SET "version" = "achievement_state"."version" + 1;

  IF TG_TABLE_NAME = 'tasks' THEN
    IF TG_OP <> 'DELETE' THEN
      IF NEW."completed" THEN
        INSERT INTO "achievement_events" ("userId", "key", "kind")
          VALUES (owner_id, 'task:' || NEW."id", 'task-completed') ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD."type" = 'WORK' AND OLD."status" IN ('ACTIVE', 'PAUSED') THEN
      INSERT INTO "achievement_events" ("userId", "key", "kind")
        VALUES (owner_id, 'cancel:' || OLD."id", 'cancelled') ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    IF TG_OP = 'INSERT' AND NEW."type" = 'WORK' THEN
      SELECT MAX("createdAt") INTO old_break FROM "achievement_events"
        WHERE "userId" = owner_id AND "kind" = 'break-completed';
      IF old_break IS NOT NULL AND CURRENT_TIMESTAMP - old_break BETWEEN INTERVAL '0 seconds' AND INTERVAL '60 seconds'
        AND NOT EXISTS (SELECT 1 FROM "pomodoro_sessions" WHERE "userId" = owner_id AND "id" <> NEW."id" AND "type" = 'WORK' AND "createdAt" >= old_break) THEN
        INSERT INTO "achievement_events" ("userId", "key", "kind")
          VALUES (owner_id, 'start:' || NEW."id", 'one-more') ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD."status" IN ('ACTIVE', 'PAUSED') THEN
      IF NEW."status" = 'COMPLETED' AND NEW."type" = 'WORK' AND NEW."duration" > 0
        AND COALESCE(NEW."completedAt", NEW."endedAt") >= NEW."startedAt" THEN
        -- Only count peers demonstrably active at the completion instant.
        -- Overdue abandoned sessions, paused sessions and anonymous accounts
        -- are excluded; room membership alone is not evidence of focus.
        SELECT COALESCE(jsonb_agg(DISTINCT s."userId"), '[]'::jsonb) INTO peers
          FROM "pomodoro_sessions" s JOIN "users" u ON u."id" = s."userId"
          WHERE s."userId" <> owner_id AND NOT u."isAnonymous"
            AND s."type" IN ('WORK', 'TIME_TRACKING') AND s."status" = 'ACTIVE'
            AND s."pausedAt" IS NULL AND s."startedAt" <= CURRENT_TIMESTAMP
            AND s."startedAt" + make_interval(mins => s."duration") > CURRENT_TIMESTAMP;
        INSERT INTO "achievement_events" ("userId", "key", "kind", "data")
          VALUES (owner_id, 'complete:' || NEW."id", 'completed',
            jsonb_build_object('peers', peers, 'room', NEW."roomId" IS NOT NULL))
          ON CONFLICT DO NOTHING;
      ELSIF NEW."status" = 'CANCELLED' AND OLD."type" = 'WORK' THEN
        INSERT INTO "achievement_events" ("userId", "key", "kind")
          VALUES (owner_id, 'cancel:' || NEW."id", 'cancelled') ON CONFLICT DO NOTHING;
      ELSIF NEW."status" = 'COMPLETED' AND NEW."type" IN ('SHORT_BREAK', 'LONG_BREAK') THEN
        INSERT INTO "achievement_events" ("userId", "key", "kind")
          VALUES (owner_id, 'break:' || NEW."id", 'break-completed') ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "achievement_session_activity" AFTER INSERT OR UPDATE OR DELETE ON "pomodoro_sessions"
  FOR EACH ROW EXECUTE FUNCTION record_achievement_activity();
CREATE TRIGGER "achievement_task_activity" AFTER INSERT OR UPDATE OR DELETE ON "tasks"
  FOR EACH ROW EXECUTE FUNCTION record_achievement_activity();

-- Historical task completions survive subsequent deletion/reopening.
INSERT INTO "achievement_events" ("userId", "key", "kind", "createdAt")
 SELECT "userId", 'task:' || "id", 'task-completed', "updatedAt" FROM "tasks" WHERE "completed"
 ON CONFLICT DO NOTHING;
INSERT INTO "achievement_state" ("userId", "timezone")
 SELECT u."id", COALESCE(w."timezone", 'UTC') FROM "users" u
 LEFT JOIN LATERAL (
   SELECT "timezone" FROM "weekly_wrapped" WHERE "userId" = u."id"
   ORDER BY "createdAt" DESC LIMIT 1
 ) w ON true
 WHERE NOT u."isAnonymous"
 ON CONFLICT DO NOTHING;
