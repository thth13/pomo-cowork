CREATE TABLE "habits" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "startDate" VARCHAR(10) NOT NULL,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "habit_completions" (
  "habitId" TEXT NOT NULL,
  "date" VARCHAR(10) NOT NULL,
  CONSTRAINT "habit_completions_pkey" PRIMARY KEY ("habitId", "date")
);
CREATE INDEX "habits_userId_createdAt_idx" ON "habits"("userId", "createdAt");
ALTER TABLE "habits" ADD CONSTRAINT "habits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
