CREATE TABLE "beep_events" (
  "id" TEXT PRIMARY KEY,
  "visitId" VARCHAR(36) NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "surface" VARCHAR(16) NOT NULL,
  "step" INTEGER,
  "pagePath" VARCHAR(500) NOT NULL,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "isAuthenticated" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "beep_events_createdAt_id_idx" ON "beep_events"("createdAt", "id");
CREATE INDEX "beep_events_surface_createdAt_id_idx" ON "beep_events"("surface", "createdAt", "id");
CREATE INDEX "beep_events_visitId_createdAt_idx" ON "beep_events"("visitId", "createdAt");
CREATE INDEX "beep_events_userId_createdAt_idx" ON "beep_events"("userId", "createdAt");
