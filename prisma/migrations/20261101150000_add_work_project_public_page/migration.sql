ALTER TABLE "projects"
  ADD COLUMN "workProjectId" TEXT,
  ADD COLUMN "coverUrl" TEXT,
  ADD COLUMN "showTasks" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "projects_workProjectId_key" ON "projects"("workProjectId");
ALTER TABLE "projects" ADD CONSTRAINT "projects_workProjectId_fkey"
  FOREIGN KEY ("workProjectId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "project_follows" (
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_follows_pkey" PRIMARY KEY ("userId", "projectId")
);
CREATE INDEX "project_follows_projectId_createdAt_idx" ON "project_follows"("projectId", "createdAt");
ALTER TABLE "project_follows" ADD CONSTRAINT "project_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_follows" ADD CONSTRAINT "project_follows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "project_views" (
  "projectId" TEXT NOT NULL,
  "visitorHash" VARCHAR(64) NOT NULL,
  "day" VARCHAR(10) NOT NULL,
  CONSTRAINT "project_views_pkey" PRIMARY KEY ("projectId", "visitorHash", "day")
);
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
