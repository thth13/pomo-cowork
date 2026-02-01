-- AlterEnum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'NotificationType' AND e.enumlabel = 'WALL_MESSAGE'
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'WALL_MESSAGE';
  END IF;
END$$;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "wallMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_wallMessageId_fkey" FOREIGN KEY ("wallMessageId") REFERENCES "user_wall_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
