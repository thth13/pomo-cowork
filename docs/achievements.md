# Achievements

Implements the user-provided Achievements System brief with 68 enabled definitions
in both public profile routes (`/@username` and `/user/:id`),
in eleven categories, five rarity tiers, secret badges, progress, profile details,
three ordered featured slots and grouped unlock notifications. A 69th definition,
One Thing at a Time, is deliberately disabled: sessions have task text, not a
stable task ID. Enable it only after durable task/session identity is available.

## Deploy

1. Apply the additive migration: `npm run prisma:migrate`.
2. Generate the client during the normal install/deploy workflow (`npm exec prisma generate`).
3. Run `npm run achievements:backfill` with the deployment database environment.
   It is restartable and safe to repeat. Individual profile visits also backfill lazily.
4. Configure a scheduler to POST `/api/cron/achievements` every minute, with
   `Authorization: Bearer <CRON_SECRET>`. Keep the server timezone stable (UTC is
   recommended and matches the normal deployment). No public admin/backfill endpoint.
   Large backlogs may require multiple calls; the response exposes `hasMore`.

The migration and backfill have not been executed against a live database as part
of implementation. No build, app, tsc or test execution is required by these changes.
Threshold tests are available for the owner via `npm run achievements:test`.

## Rules and sources

- Only completed WORK / TIME_TRACKING records contribute to focus/day/week/project
  milestones, using the existing effective-minute helper. Only completed WORK
  records count toward Pomodoro totals. Breaks and cancelled Pomodoros are excluded.
  Stopped trackers currently use CANCELLED in the existing model and therefore do
  not contribute to these **completed-focus** milestones.
- Completed time belongs to its completion day. The authenticated sync persists the
  browser's valid IANA timezone; migration reuses the latest stored weekly-recap
  timezone when available, otherwise UTC is the fallback. Monday–Sunday
  weeks and consecutive local calendar dates handle DST. Streaks require 25 minutes;
  consistency requires 60 minutes. Progress uses the best historical run/day/week.
- Project progress uses the largest individual project total. Triggering project
  ID/name are stored in private award metadata, never returned publicly.
- Task completion is a unique per-task event, seeded from existing completed tasks.
  Reopening/recompleting never duplicates credit; deleting a completed task does not
  erase earned credit. There are no task/project creation or onboarding awards.
- New session transitions are captured atomically by PostgreSQL triggers, not React.
  Completion snapshots record distinct non-anonymous peers whose WORK/tracker session
  is ACTIVE, unpaused and not overdue at the completion instant. Membership alone is
  insufficient. Social badges, room completions, uninterrupted sequences and
  Just One More start from deployment; no historical social activity is fabricated.
  Peer IDs remain internal. Pauses do not interrupt a sequence; cancellation, reset
  via cancellation, replacing an active timer, and deletion of active work do.
- Night/date and inactivity badges use reliable existing timestamps. Any intervening
  work/tracker activity, including cancellations, breaks inactivity. An initial
  session never counts as a return. Long absence is measured in full elapsed days.
- Weekly leaderboard rules match the existing leaderboard: server calendar,
  effective WORK/tracker time including eligible stopped records, descending minutes,
  stable user-ID tie break, registered accounts and positive time only.
  Reached ranks are recorded when the current weekly leaderboard is viewed and by
  the cached minute worker. These are observed positions, not a reconstruction of
  unobserved historical standings. Champion is separately awarded when a closed
  week is finalized, starting with the deployment week. Finalization is immutable,
  retries are safe, and missed jobs catch up eight weeks per run. Keep the scheduler
  running: retroactive edits before delayed finalization can change that week's
  computed winner; edits after finalization cannot change the award.
- Unlock timestamps mean first evaluation/award time, including historical backfill.
  Existing awards are permanent. Deleting source history never revokes them.
  Initial backfill unlocks appear as one summary, not dozens of notifications.
- Rarity percentages are a daily stored aggregate over non-anonymous accounts. They
  stay hidden until historical evaluation completes and are hidden if over two days
  old. No expensive population aggregation runs when opening a profile.

## Architecture and permissions

`definitions.ts`: typed registry and threshold predicate.
`engine.ts`: pure single-pass reusable calendar statistics and event evaluation.
`server.ts`: cached progress, server-only awards, unique inserts and sanitized views.
`leaderboard.ts` / `jobs.ts`: shared ranking snapshots, catch-up and population jobs.

The engine is kept off the timer-completion response path. Database triggers only
capture events and increment a dirty revision in the existing transaction. Sync
(authenticated, visible tabs every 45 seconds and after completion/focus) or cron
drains changes. A failed evaluation leaves the revision dirty; updates racing an
evaluation remain dirty for the next pass. Advisory locks serialize each account's
evaluation/featured writes; composite primary keys prevent duplicate awards.
Statistics use one history read and one event read per dirty account, not one
aggregation per achievement. The historical script batches accounts.

- GET `/api/achievements/:userId`: registered public profile; progress owner-only.
- POST `/api/achievements/sync`: authenticated own timezone, evaluation and pending IDs.
- PUT `/api/achievements/featured`: own unlocked IDs, unique, ordered, maximum three.
- POST `/api/achievements/notifications`: atomic own pending notification claim,
  postponed if any focus timer is still active/paused on the server.
- POST `/api/cron/achievements`: timing-safe deployment secret check.

Notification claims are made immediately before display and persisted across tabs.
As with most toast delivery, closing a tab between claim and rendering can lose the
toast, but the unlocked badge always remains in the profile. Network failures retain
pending claims when the request did not commit; profile browsing is the durable record.

## Manual verification

- Migrate on a development database; run historical backfill twice and compare unique
  unlock totals. Check 25-minute streak boundaries, DST and Monday/Sunday boundaries.
- Complete work, breaks, cancelled work, task reopening, project milestones and a
  room session. Confirm only eligible records count; inspect new event rows.
- Open a second focusing account; complete work, then repeat with paused/overdue peers.
- Open own/public profile, switch English/Spanish and light/dark themes, filter,
  inspect secret/unlocked details, feature three, reorder/remove, test fourth-slot
  prevention, failed saves and two concurrent tabs.
- Verify loading/retry, 360px layout, keyboard modal focus/Escape/restoration and
  screen-reader names. Public JSON must not contain metadata, peer IDs or progress.
- Unlock several awards while focusing: no interruption; one summary after focus
  ends, with a functioning profile link and no duplicate toast in another tab.
- Verify weekly positive-time ranks, ties, distinct #1/Champion and repeated closed
  week finalization. Test cron without/wrong/correct secret.

## Implementation verification

Targeted ESLint, Prisma schema validation and git diff whitespace checks passed.
Builds, running the app, tsc, unit tests and live database migrations were not run,
as requested. The strict UI audit found two existing issues outside this feature:
native-select ownership on app/stats/page.tsx and textarea resize styling on
app/settings/page.tsx. Runtime/browser acceptance cases above remain unverified.
