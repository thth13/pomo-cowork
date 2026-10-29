# Room activity and shared progress

Source: room redesign request, 2026-10-27. Existing room owner/member permissions
and recorded session lifecycle remain authoritative.

## Behavior

- Live coworkers come exclusively from Socket.IO's in-memory snapshots. The page
  displays only its own room and distinguishes working, time tracking, paused and
  break sessions. A disconnected socket never presents stale coworkers as live.
  Snapshots carry access status and the client's account/connection version. Failed
  verification shows an error with retry, never "0 focusing" or an empty-room CTA.
  An unanswered access check times out; restoring access reloads open room chat.
- Publisher verification is independent of viewer access. Registered identity is
  resolved from the bearer token; guest sessions carry a signed per-session publishing
  capability issued by session creation. The capability is never broadcast or logged.
  Start/sync/pause/tick/end events use authorized server session/profile fields,
  including the real room and task. Database reads validate connected publishers only;
  they never seed online lists. Stale identity/snapshot checks cannot republish a session.
- Viewing a room does not change the selected timer workspace. Focus in this room
  joins a public room if needed, selects it and opens the existing timer for task
  selection. An active or paused session elsewhere prevents switching.
- TimerRuntime is mounted under AuthProvider on every route and owns restoration,
  the shared clock and completion. Staying in a room no longer postpones saving
  focus. Completion uses the countdown deadline, deduplicates in-flight attempts,
  retries failed saves after 15 seconds, and rejects stale account/session results.
  PomodoroTimer registers presentation callbacks and its mini-window clock host;
  leaving it cancels its auto-start, while the current session keeps running.
- Completed WORK sessions increment their bound task counter in the same transaction
  as session/reward persistence, once per terminal transition. The old separate
  increment endpoint is a compatibility no-op; the new client sends no second write.
  Deleted tasks do not prevent recording a completed session.
- Today and the recurring goal reset at midnight UTC; weeks start Monday UTC.
  Focus is attributed to session completion/stop, consistent with sessionStats.
  Only positive effective WORK/TIME_TRACKING minutes from COMPLETED/CANCELLED
  sessions count. Pomodoro counts include only COMPLETED WORK sessions.
  SQL duration/remaining-time arithmetic uses bigint before multiplication and
  subtraction, including for older oversized records. Session writes validate the
  PostgreSQL Int bounds, including conversion of duration minutes to seconds.
- Rankings contain the top 20, plus the viewer's own position if outside that list.
  Equal minute totals share a rank. Historical contribution remains after leaving.
- One recurring daily goal belongs to each room. Only the current owner can create
  or edit it. Title: 1–80 characters; target: 5–480 whole minutes per member.
  Current members and the owner participate automatically. All focus recorded in
  the room today counts, including work before goal creation. Editing recalculates
  today's result immediately, explained before saving. Concurrent edits return 409
  and preserve the draft. Owner checks and writes share a room-row transaction lock.
  Goal eligibility reads the current owner in the same RepeatableRead snapshot as
  members, goal and recorded focus, including a fresh private-room access check.
- Personal contribution includes today/week/all time, share of room totals, active
  days, today's rank and a streak. Room streak counts consecutive days with positive
  focus. Yesterday's streak stays alive while the current day is still unfinished.
- Room headings omit the five removed motivational/helper subtitles in both English
  and Spanish. Actionable active-session restrictions remain visible.
- Invite friends shares the canonical room URL. Private links do not grant access;
  the owner uses the existing username invitation workflow. Public visitors can
  sign in and join. Google sign-in restores the room from a bounded, same-origin
  sessionStorage return path; tokens are never placed in shared links.
- Statistics refresh while visible, on focus/reconnect, after local timer changes
  and at the UTC boundary. Failed refresh retains labeled last results; access loss
  hides statistics. Dialogs reuse CommunityDialog, including pending locks, error
  recovery, keyboard focus and explicit challenge draft discard.
- Room metadata and participants load from the same authorized database snapshot
  through `GET /api/rooms/[id]/members`. Background refresh updates owner controls
  without resetting settings drafts. Removing a member or saving room settings
  cancels older reads and revalidates; late responses from another room/account
  are ignored. Visible rooms refresh every minute and on focus/reconnect.
- Socket chat-history responses include the requested room ID and a client-generated
  request ID, even for empty/denied histories. Chat accepts only its pending fallback
  for the current room, account and opening; HTTP history and pagination follow the
  same load lifetime. Responses without matching metadata cannot replace messages.
  Valid history merges with live arrivals by ID instead of replacing the list, including
  pagination and own optimistic sends. Removed IDs stay excluded for the current load.
  New chat publishers pass the persisted message ID, verified by the API before broadcast.

## Deployment and manual verification

Apply `20261027130000_add_room_challenges` with the normal migration process and
regenerate the Prisma client before running the updated app. Deploy the updated
socket server together with the app; it filters room sessions and messages by
server-verified visibility, revalidated at most every 30 seconds and on account or
room changes. The local Prisma client was generated; no migration has been applied
by this change.
Coordinate the application and socket release: the new client requires tagged history
and access-status metadata, while the socket requires the new session-presence and
saved-message API endpoints. If separating backend/frontend releases, publish the API,
then the socket, then the client. The socket retains array histories for older clients
without request IDs. Do not deploy the verifying socket against an older API. Registered
sessions can reverify after reconnect. Guest sessions created by an older app have no
publishing capability and need a new session to appear online; their timer and recorded
focus remain intact. This hardening needs no additional database migration.

Manual scenarios: public visitor → sign-in → join → timer; private invitation and
member chat; disconnected/reconnected live feed; paused/time-tracking sessions;
challenge create/edit and concurrent edits; own rank outside the top 20; equal
rankings; empty/new rooms; midnight/Monday boundaries; share clipboard fallback;
owner departure/last-member deletion; mobile layout and English/Spanish themes.
Runtime checks, builds, app startup and tsc are intentionally user-owned.

Membership regression scenarios for manual verification: delay a participant GET,
remove a member, then release the old response (the member stays removed); transfer
ownership in another tab and focus the new owner's tab (management controls appear);
switch room/account while a read or removal is pending (old results are ignored);
edit settings while a background refresh finishes (the draft is preserved).

Statistics/chat regression scenarios for manual verification: oversized duration
or remaining-seconds writes return 400; legacy durations above 35,791,394 minutes
and distant session dates do not overflow the room aggregate. Delay room A's socket
history, open room B with successful HTTP history, then release A's response (B
stays intact). Repeat with empty/global history, A → B → A, an account change and
closing/reopening Chat; only the current matching fallback can update messages.

Timer/access/ownership scenarios for manual verification: start focus, stay on a
room through completion, and confirm the recorded session, goal and rank update;
repeat with pause/resume, mini-window closure, a hidden tab, midnight, a failed
completion request and an account switch. A direct room load restores an account
session, including an expired one. Fail the socket server's room-access lookup while
the browser's room GET still succeeds: show an error rather than an empty room, then
recover live activity and chat after retry. Transfer ownership between the initial
stats access check and aggregate read: owner and participants must describe one
snapshot, with no departed owner added from the earlier check.

Publisher/chat/counter regression scenarios for manual verification: forge a registered
user ID or another session/room/task in socket payloads; attempt foreign pause/tick/end;
repeat with a missing/wrong guest capability. No claimed fields should be broadcast.
Check guest publishing separately for the ordinary Start button, starting from a task,
and the automatic next session: each creation path must retain the returned capability
in the current session and send it with the initial socket event. Repeat pause/resume
and reconnect so subsequent snapshots still use that same capability.
Reconnect a valid publisher, change account during verification, and fail/recover the
verification API. Delay HTTP/socket history while messages arrive or are removed, then
release it; messages stay present once and deletions stay removed. Repeat while sending
an optimistic message and loading older pages. Complete the same session from two tabs,
lose/retry the completion response, and send a legacy task increment: the task gains one
Pomodoro. Breaks/cancellations do not increment; deleting the task does not block completion.

Static verification: targeted ESLint, CSS parsing and `git diff --check` passed.
Socket ESLint used `--no-inline-config` because its pre-existing suppression names
an uninstalled `@typescript-eslint/prefer-nullish-coalescing` rule. The skill's
repository-wide static audit reported only an existing missing machine-readable
native-select ownership declaration for `app/stats/page.tsx`; its native year picker
is already described in DESIGN.md and UX-CONTRACT.md. No runtime UI claim is made.
