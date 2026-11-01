CREATE TABLE "beep_conversations" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "title" VARCHAR(100) NOT NULL,
  "greeting" VARCHAR(500),
  "revision" INTEGER NOT NULL DEFAULT 0,
  "activeRequestId" TEXT,
  "activeUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "beep_conversations_userId_updatedAt_id_idx" ON "beep_conversations"("userId", "updatedAt", "id");
CREATE TABLE "beep_turns" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "beep_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sequence" INTEGER NOT NULL,
  "userText" VARCHAR(2000) NOT NULL,
  "assistantText" VARCHAR(5000) NOT NULL DEFAULT '',
  "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "beep_turns_conversationId_sequence_key" ON "beep_turns"("conversationId", "sequence");
CREATE INDEX "beep_turns_conversationId_createdAt_id_idx" ON "beep_turns"("conversationId", "createdAt", "id");
