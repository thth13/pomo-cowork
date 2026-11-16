ALTER TABLE "user_settings"
ADD COLUMN "startSound" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN "stopSound" TEXT NOT NULL DEFAULT 'classic';
