ALTER TABLE "users" ADD COLUMN "referrer" VARCHAR(500);
ALTER TABLE "visitor_identities" ADD COLUMN "userId" TEXT;
CREATE INDEX "visitor_identities_userId_idx" ON "visitor_identities"("userId");
ALTER TABLE "visitor_identities" ADD CONSTRAINT "visitor_identities_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Recover attribution for any existing profile whose guest row still survives.
UPDATE "users" AS u
SET "referrer" = LEFT(g.details->>'referrer', 500)
FROM "guest_visits" AS g
WHERE g.id = u.id AND NULLIF(g.details->>'referrer', '') IS NOT NULL;
UPDATE "visitor_identities" AS v
SET "userId" = u.id
FROM "users" AS u
WHERE v.id = u.id;
