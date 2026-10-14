ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_color_check";

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_color_check"
CHECK ("color" IS NULL OR ("parentId" IS NULL AND "color" IN ('red', 'orange', 'gold', 'green', 'teal', 'blue', 'purple', 'pink', 'coral', 'amber', 'olive', 'lime', 'emerald', 'cyan', 'sky', 'indigo', 'magenta', 'brown', 'slate')));
