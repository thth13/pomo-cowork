-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "actionDuration" INTEGER,
ADD COLUMN     "actionType" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'message';
