# Weekly Wrapped

## Deployment

Run `npm run prisma:migrate` against the intended database during deployment, then
`npm exec prisma generate` before the normal deployment build. The migration adds
`weekly_wrapped` (cascading account deletion) and an expression index on eligible
session completion dates. No live migration was applied during implementation.
Prisma Client was generated locally. Builds, app startup and tsc were not run.

## Data rules

- Browser IANA timezone; server validates it. Local date keys define Monday through
  Sunday inclusively. Calendar arithmetic never adds 168 hours, so DST is respected.
- Completion-date attribution matches existing statistics. A session crossing midnight
  or Monday counts once, in full, on its local completion day. It is not prorated.
  Session rows do not contain pause intervals, so splitting focus across days would
  invent a precise distribution that the stored data cannot support.
- Completed WORK and TIME_TRACKING count. Stopped TIME_TRACKING is also successful
  focus: the existing lifecycle persists it as CANCELLED with stored elapsed minutes.
  Cancelled WORK, breaks and ongoing/paused sessions never count. All minutes use
  `getEffectiveMinutes`; favorite hour is the most frequent local start hour.
- Best day and streak use completion days. Streak is confined to the seven local dates.
  Ties choose the earliest day/hour; project ties choose ID deterministically.
- No project falls back to longest focus session. Comparison is absent when the
  previous week's total is zero. A zero week never opens automatically.
- Community comparison aggregates the identical absolute week window, using the
  viewer's timezone, for registered accounts excluding the viewer. Eligible peers
  have at least 25 minutes. At least 30 peers are required; ties aren't ranked below
  the viewer. Percentage is floored, never fabricated. A null percentile displays an
  encouraging statement with no claim about rank or historical personal records.

## Persistence and performance

The first generation stores version-1 JSON plus timezone under `(userId, weekStart)`.
Session reads are limited to the two relevant weeks (with timezone boundary padding).
Community aggregation runs in SQL, once per newly generated nonempty snapshot.
Subsequent visits read the snapshot. Names and totals remain stable after project
renaming/deletion or session edits. This deliberately preserves historical reports;
a future explicit correction flow would need to delete/rebuild affected snapshots.
Changing timezone does not create a second snapshot for the same local Monday.

`GET /api/wrapped?timezone=...&week=YYYY-MM-DD` returns a snapshot and saved history.
Omitting week generates the most recent completed week. Earlier ungenerated weeks can
be requested from the native date picker in Weekly Recaps; any selected date resolves
to its Monday. Only completed weeks from 2020 onward are accepted. Current weeks are
rejected. GET never changes viewedAt. All responses are private/no-store.

`POST /api/wrapped { weekStart }` atomically sets viewedAt only if still null, the
snapshot is nonempty, and it is the most recent completed week in its saved timezone.
Only the winning tab/device opens automatically. Claims occur immediately before
opening: a tab/network crash between a committed claim and display can consume the
one-time automatic opening, but the report is still available in Weekly Recaps.
The global provider checks on authentication, focus and once per minute while visible,
and defers if another dialog is open. Old reports never automatically replay.

## Sharing

The client pre-generates a 1080×1350 PNG. The share click uses file-capable Web Share;
unsupported browsers download the card. Download and copy-text actions remain separate.
Cancellation does not show an error. Card-generation failures can be retried; text
copy remains usable. No task/project names, account identifiers or private links are
included. The private on-screen summary may show the top project.

## Manual acceptance checklist (not executed)

1. Seed completed focus on Sep 21–27; visit on Sep 28 in the browser timezone.
   Check totals against getEffectiveMinutes; dismiss and reload in two tabs/devices.
   Only one automatic viewer should open. Reopen it from both statistics pages.
2. Change project name/delete project after first generation; the saved report stays
   identical. Sign out and switch accounts while a request is pending: no old viewer.
3. Test a single completed session; zero sessions; breaks only; cancelled WORK;
   stopped tracker; no project; deleted project; a 100-character project name.
4. Test UTC, Europe/Kyiv and America/New_York at Monday midnight and DST transitions.
   A Sunday-start/Monday-end session belongs entirely to Monday's new week.
5. Request the current week directly: 400. Try another user's identifiers: routes
   ignore them and use the authenticated identity. Without bearer auth: 401.
6. Previous week zero: no comparison slide. Lower/equal/higher totals: finite values.
   Under 30 qualifying peers: no percentile. At 30+: compare SQL sums and strict ties.
7. Keyboard from initial close-button focus: arrows navigate, Tab stays in dialog,
   Escape closes and restores the opener. Swipe horizontally; vertical scroll works.
   Check 320px width, landscape, 200% zoom, dark theme, reduced motion, forced colors.
8. Export on iOS/Android supporting file sharing and desktop download fallback.
   Verify 1080×1350 PNG, no private names, English/Spanish copy; cancel sharing.
   Deny clipboard permission and simulate failed canvas generation/network requests;
   inspect retry states. Test offline startup and subsequent focus recovery.
