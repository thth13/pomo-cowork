ALTER TYPE "NotificationType" ADD VALUE 'PRODUCT_UPDATE';
ALTER TABLE "notifications" ADD COLUMN "productUpdateId" VARCHAR(80);
CREATE UNIQUE INDEX "notifications_userId_productUpdateId_key" ON "notifications"("userId", "productUpdateId");
