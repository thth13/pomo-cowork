# Project journal MVP

## Entry points

- `/settings/profile`: choose a public username and edit the existing user profile.
- `/projects`: private project management; `/projects/new` creates a project.
- `/@username`: public projects, updates, and activity.
- `/@username/projects/slug`: public project, timeline, and updates.
- `/@username/posts/slug`: permanent update URL; editing the title preserves its slug.
- `/journal`: own published/private updates and drafts; `/journal/compose` is the editor.
- `/journal/weekly`: completed focus time for the current UTC week; Write weekly update opens a draft composer.
- `/feed`: only public, published updates from followed users, newest first.
- `/discover`: paginated people with public projects.
- The root sitemap includes up to 10,000 recent public profiles, 10,000 projects, and
  10,000 published posts. Split into sitemap shards before exceeding this MVP cap.

The main timer's Focus project selector assigns a project when a work session starts.
An active or paused session keeps its project. The project is not inferred from a task
name, and earlier sessions are not silently attributed to a new project.

## Database deployment

Schema and migration: `prisma/migrations/20260930120000_project_journal/migration.sql`.
The migration has NOT been applied by the implementation agent. Before deployment,
review your normal database backup/deployment procedure and run:

```sh
npm run prisma:migrate
npm exec -- prisma generate
```

The migration only adds fields, tables, constraints, and indexes. It does not delete
sessions or rewrite legacy usernames. A case-insensitive username index prevents
concurrent claims; if the database already has names differing only in letter case,
resolve those with the affected account owners before deploying. New registration,
Google-generated names, and explicit username edits use the shared normalized rules.
Legacy public names continue to resolve until edited. Changing a username or project
slug changes its public URL; no alias system is introduced in this MVP.

## Data and privacy contract

- Reuse User and PomodoroSession. No parallel authentication or focus counters.
- Count `COMPLETED` `WORK`/`TIME_TRACKING` sessions and stopped `TIME_TRACKING`
  sessions stored as `CANCELLED` with an `endedAt` timestamp. Use effective minutes
  (including legacy tracker elapsed-duration records) and session-end attribution.
  Zero-time entries, cancelled WORK sessions, active/paused sessions, and breaks do
  not count for project totals and new post snapshots; existing post snapshots
  remain historical.
- Public profile totals, heatmap, and streak use `buildStatistics`, the same
  calculation as `/api/statistics`: both COMPLETED and CANCELLED WORK/TIME_TRACKING
  entries contribute positive effective minutes, including manually stopped Pomodoros.
  Future-dated entries are excluded. Public calendar days use UTC; the private
  dashboard uses the viewer's timezone, so daily grouping/streaks can differ near
  midnight, while lifetime focus minutes use identical rules. Only aggregates are
  exposed; task names and private project details are not loaded for this calculation.
- Lifetime statistics and heatmap include all completed focus time as an aggregate;
  private project identities and session task details are not published in the journal.
- Public project lookup requires PUBLIC. Public updates require PUBLIC, publishedAt,
  and either no project or a currently PUBLIC project. Feed, timeline, profile updates,
  post detail, comments, reactions, and image reads enforce these gates server-side.
- Private project session details are filtered from the existing public user endpoints.
- Only owners can mutate projects/posts; only comment authors can delete their comments.
  No new moderator privilege is inferred. Anonymous accounts cannot write journal data.
- Draft/private pages require bearer authentication and are noindex. Public server pages
  render without authentication and are dynamic; no persistent public snapshot cache.
- Images are raster-only PNG/JPEG/WebP, up to 2 MB each, four per post, 30 uploads per
  account/day. Bytes live in PostgreSQL for this MVP, avoiding a public blob URL for
  unpublished work. The authenticated/public attachment endpoint is `private, no-store`.
  An image reused on a still-public entry remains public through that entry. Removing
  an attachment does not immediately delete its stored bytes; storage cleanup is a
  future maintenance job. Use a private object store for larger-scale deployment.
- Project deletion cascades its journal records, milestones, comments and support;
  existing sessions survive with a null projectId. An explicit confirmation explains it.
- Milestone time/session snapshots are derived through the selected UTC date (through
  the present instant for today). Editing prose preserves historical snapshots.
- Weekly snapshots use Monday-to-now in UTC, scoped to the selected project if present.
  No task-completion count is fabricated: the existing Task model has no completion
  timestamp. Monthly Wrapped now lives at `/journal/monthly` (see `monthly-wrapped.md`);
  weekly journal updates remain manually composed.
- Activity records project creation/completion, published milestones, and deduplicated
  significant focus/session/streak thresholds. No event is created per ordinary session.
  Threshold detection runs on focus completion and nonzero tracker stops;
  historical crossing dates are not invented or backfilled.
- Follow and Support use unique composite constraints and idempotent PUT/DELETE.
  Project/post creation has a client-generated request id, reused for uncertain retries.
- Markdown is rendered as escaped React text, with headings, bold, lists, and http(s)
  links only. No raw HTML or executable markdown is supported.

## Manual acceptance checklist

The user asked to run the application and builds themselves. No app, build, or tsc was
run during implementation. After applying the migration, check with two accounts and
an incognito browser:

1. Edit a username (case normalization, duplicate, invalid, reserved); clear optional
   profile fields; upload an avatar. Visit the canonical public profile signed out.
2. Create public and private projects; pin one, then another; confirm only one is current.
   Edit dates/status/links; reject invalid URLs and dates. Paginate past 20 projects.
3. Select a project, finish a work timer and stop a Time Track session (including after
   a pause), and inspect project/profile totals, heatmap, streak, and new post stats.
   Both focus modes count. Breaks, cancelled WORK, unfinished timers, and zero-time
   tracker stops must not increase them; legacy stopped trackers count elapsed time.
   Restore a paused session and confirm its original association survives.
4. Publish an update, custom/preset milestone, and weekly update. Edit titles without
   changing post URLs. Check Markdown, images, snapshot dates, and focus-stat visibility.
5. Set a project private and unpublish a post. Check direct profile/project/post URLs,
   feed, timeline, comments, image URLs, and foreign-account API requests for leakage.
   Try attaching another user's project or image by manually altering requests.
6. Follow/unfollow, support/remove support, add a comment, and delete only your own.
   Repeated actions and request retries must not create duplicate relationships/posts.
7. Confirm /feed contains followed users' published writing, with pagination; activity
   milestones appear separately and ordinary session completions never flood the feed.
8. Inspect 365-day heatmap tooltips by keyboard and pointer, mobile horizontal scroll,
   light/dark theme, narrow forms, reduced motion, loading, failure/retry, and empty states.
9. Verify UTC week boundary and backdated milestones. Open My updates, choose Write
   weekly update, review prefilled stats and editable content; nothing auto-publishes.
10. Leave a dirty editor through a link or reload; check the discard prompt, failed-save
    value preservation, busy submit/upload controls, toast feedback, and safe deletion.

Static validation performed: Prisma schema validation and client generation, targeted
ESLint, and whitespace/diff inspection. The design audit's existing stats/settings
findings are unrelated to the journal; runtime and accessibility checks remain manual.
