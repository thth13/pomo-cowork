ALTER TABLE "user_settings"
  ADD COLUMN "minimalTimer" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "offline" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hideRoomSwitch" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "settings_changes" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "previousValue" BOOLEAN NOT NULL,
  "nextValue" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settings_changes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "settings_changes_createdAt_id_idx" ON "settings_changes"("createdAt", "id");
CREATE INDEX "settings_changes_userId_createdAt_idx" ON "settings_changes"("userId", "createdAt");
ALTER TABLE "settings_changes" ADD CONSTRAINT "settings_changes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
