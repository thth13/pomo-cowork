CREATE TABLE "product_update_events" (
    "id" TEXT NOT NULL,
    "sessionId" VARCHAR(36) NOT NULL,
    "productUpdateId" VARCHAR(80) NOT NULL,
    "action" VARCHAR(24) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_update_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_update_events_action_check" CHECK ("action" IN ('scrolled_to_end', 'closed'))
);

CREATE UNIQUE INDEX "product_update_events_userId_sessionId_action_key" ON "product_update_events"("userId", "sessionId", "action");
CREATE INDEX "product_update_events_createdAt_id_idx" ON "product_update_events"("createdAt", "id");
ALTER TABLE "product_update_events" ADD CONSTRAINT "product_update_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
