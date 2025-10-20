-- AlterTable
ALTER TABLE "pomodoro_sessions" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "remainingSeconds" INTEGER;
