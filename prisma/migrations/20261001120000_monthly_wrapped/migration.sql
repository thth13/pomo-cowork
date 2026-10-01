ALTER TYPE "NotificationType" ADD VALUE 'MONTHLY_WRAPPED';
ALTER TABLE "notifications" ADD COLUMN "wrappedMonth" VARCHAR(10);
CREATE TABLE "monthly_wrapped" (
  "userId" TEXT NOT NULL,
  "monthStart" VARCHAR(10) NOT NULL,
  "timezone" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "notifiedAt" TIMESTAMP(3),
  "viewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monthly_wrapped_pkey" PRIMARY KEY ("userId", "monthStart"),
  CONSTRAINT "monthly_wrapped_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Legacy weekly snapshots are retained; monthly totals are generated from sessions.
