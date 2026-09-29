-- Stopped trackers used to retain the remainder of a 24-hour countdown
-- alongside their elapsed duration. Normalize only that known legacy format.
UPDATE "pomodoro_sessions"
SET "remainingSeconds" = 0
WHERE "type" = 'TIME_TRACKING'
  AND "status" = 'CANCELLED'
  AND "remainingSeconds" > 0
  AND ABS("duration" * 60 + "remainingSeconds" - 86400) <= 30;

-- Credit previously unawarded tracking entries at the base rate (4 XP/minute).
-- Historical streak bonuses are deliberately not reconstructed.
WITH credited AS (
  UPDATE "pomodoro_sessions"
  SET "experienceAwarded" = "duration" * 4
  WHERE "type" = 'TIME_TRACKING'
    AND "status" = 'CANCELLED'
    AND "remainingSeconds" = 0
    AND "duration" > 0
    AND "experienceAwarded" = 0
  RETURNING "userId", "experienceAwarded"
), totals AS (
  SELECT "userId", SUM("experienceAwarded")::integer AS experience
  FROM credited
  GROUP BY "userId"
)
UPDATE "users" AS u
SET "experience" = u."experience" + totals.experience
FROM totals
WHERE u.id = totals."userId";
