CREATE TABLE "workspace_notes" (
    "userId" TEXT NOT NULL,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "legacyImported" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_notes_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
