-- CreateTable
CREATE TABLE "user_wall_messages" (
    "id" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wall_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_wall_messages_profileUserId_createdAt_idx" ON "user_wall_messages"("profileUserId", "createdAt");

-- CreateIndex
CREATE INDEX "user_wall_messages_authorId_createdAt_idx" ON "user_wall_messages"("authorId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_wall_messages" ADD CONSTRAINT "user_wall_messages_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_wall_messages" ADD CONSTRAINT "user_wall_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
