ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "paddleSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "paddleCancelAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_paddleSubscriptionId_key" ON "users"("paddleSubscriptionId");
