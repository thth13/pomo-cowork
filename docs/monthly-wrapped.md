# Monthly Wrapped

Replaces Weekly Wrapped. `/journal/weekly` redirects to `/journal/monthly`.
The statistics pages and monthly page reuse the same archive and story viewer.

## Deployment

Run `npm run prisma:migrate` during deployment, then `npm exec -- prisma generate`.
The new migration adds `monthly_wrapped`, the MONTHLY_WRAPPED notification type and
notifications.wrappedMonth. Legacy weekly snapshots remain untouched for compatibility;
they are never used as monthly totals. No database migration was applied in this task.
Prisma Client was generated locally. Builds, app startup, tests and tsc were not run.

## Data

Calendar months use the validated browser IANA timezone, including leap years and DST.
A session counts once, in full, on its completion date. Completed WORK/TIME_TRACKING
and stopped TIME_TRACKING count using sessionStats effective minutes. Cancelled WORK,
breaks and ongoing sessions do not count. Best day, active days and streak cover every
day of the selected month. Comparison uses the entire previous calendar month and is
omitted when it has zero focus. Favorite hour uses local session start times.

Snapshots are immutable under (userId, monthStart), including the original timezone.
Only the two relevant months of sessions are fetched with timezone boundary padding.
Community comparison uses the same month window, excludes the viewer and anonymous
accounts, requires 25 minutes per peer and at least 30 peers. Ties are not ranked below
the viewer. The existing completion-date SQL index supports these queries.

## Notification lifecycle

GET /api/wrapped?timezone=...&month=YYYY-MM-01 defaults to the last completed month.
Current/future months and dates before 2020 are rejected. Responses are private/no-store;
identity always comes from bearer authentication. GET returns the snapshot and archive.
For a nonempty latest month it also creates one deterministic inbox notification;
creation is serialized with view acknowledgments to avoid unread-message races.

POST /api/wrapped { monthStart, action: "notify" } atomically claims notifiedAt.
Only one tab/device shows the top-right invitation. The global provider checks on
login, focus and every minute while visible. Report/inbox creation is never blocked
by workspace windows. Only the toast waits behind an open modal or another corner
toast; hidden and non-modal windows do not defer it. The invitation lasts 12 seconds, paused on hover/focus/hidden tabs.
It never opens the story automatically. Closing or timing out leaves the message
unread in the existing notifications menu, including after reload and next month.
A crash after claiming delivery can consume the toast, but the inbox message remains.

Explicit opening from the toast, inbox or archive loads the report and acknowledges it
via POST /api/wrapped { monthStart }. This records viewedAt and marks its message read
in one transaction. Failed requests preserve a retry path. Viewing older messages
works after the month changes. Zero-focus months do not send invitations.

## Presentation and sharing

The daily chart supports 28–31 bars; streak cells wrap into seven columns. Export uses
all monthly bars within the existing 1080×1350 card. English/Spanish labels, date labels,
share text and filenames use months. Cards contain aggregate statistics, never private
project/task names or user identifiers. Native sharing requires an explicit click.

## Manual verification (user-owned)

- On October 1, September's total matches statistics; compare against August.
- February has 28/29 days; December rolls into January correctly; test DST/timezones.
- Invite appears top-right; ignore/dismiss it and reload: the inbox message remains.
- Open from inbox/toast/archive: correct month opens and its message becomes read.
- Two tabs/devices: one toast, one inbox record; concurrent view/load stays read.
- Switch accounts during pending requests: no previous account's report appears.
- Zero focus sends nothing; old messages still open after another month begins.
- Network failures preserve retry; verify keyboard, mobile, dark mode, reduced motion.
- Share/download card: all days fit; no weekly wording or private names.
