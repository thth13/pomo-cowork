ALTER TABLE "tasks" ADD COLUMN "color" TEXT;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_color_check"
CHECK ("color" IS NULL OR ("parentId" IS NULL AND "color" IN ('red', 'orange', 'gold', 'green', 'teal', 'blue', 'purple', 'pink')));
