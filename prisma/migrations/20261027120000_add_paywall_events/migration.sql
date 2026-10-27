CREATE TABLE "paywall_events" (
    "id" TEXT NOT NULL,
    "event" VARCHAR(40) NOT NULL,
    "plan" VARCHAR(10),
    "pagePath" VARCHAR(500) NOT NULL,
    "isAuthenticated" BOOLEAN NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paywall_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "paywall_events_event_createdAt_idx" ON "paywall_events"("event", "createdAt");
CREATE INDEX "paywall_events_userId_createdAt_idx" ON "paywall_events"("userId", "createdAt");

ALTER TABLE "paywall_events" ADD CONSTRAINT "paywall_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
