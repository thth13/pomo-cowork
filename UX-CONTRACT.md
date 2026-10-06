# UI ownership and behavior

## Sources

- User redesign request: pixel identity, sprout companion, care and work as food.
- README.md: coworking timer, tasks, real-time presence and statistics.
- services/sessionService.ts and components/PomodoroTimer.tsx: session lifecycle and completion.
- store/useTimerStore.ts: running/paused state and countdown.
- Existing API routes remain authoritative for permissions, billing and user data.
  This change introduces no server schema or authorization changes.

## Canonical UI map

| Capability | Owner | Behavior |
| --- | --- | --- |
| Timer / session transitions | PomodoroTimer, TimerControls, useTimerStore, sessionService | Preserve existing start/pause/resume/stop/complete operations |
| Native mini timer | useDocumentPictureInPicture, TimerPictureInPicture, TimerActions | User-opened Document Picture-in-Picture window; portal shares timer state, locale, action handlers and pending flags; closing never stops the session |
| Task selection | TaskPicker | Existing authored picker; reused |
| Forms and settings | SettingsModal, existing .input and .btn | Existing settings workflow; shared visual adaptation |
| Scrollbar | app/globals.css | Global visible baseline, theme tokens and forced-color fallback |
| Notifications | useNotifications / NotificationToast | Existing global session feedback |
| Progress / rank | TodayContribution / lib/ranks.ts / useAuthStore | Dock opens existing progress panel; localized current XP rank is available in its accessible name and tooltip |
| Presence surface | ActiveSessions | Homepage uses a permanent right-side rail with flat coworker rows; stacks below the centered timer on narrow screens; room screens retain panel variant |
| Companion feedback | PocketGarden | Local, stable role=status region; no overlay or focus stealing |
| Companion state | usePetStore | Local browser persistence; localStorage failures fall back to memory with visible notice |
| Theme | useThemeStore / ThemeProvider | Existing light/dark selection |
| Timer appearance | AppearanceSettings, WorkspaceBackground, useAppearanceStore | Native modal and radio choices; images apply and persist after loading; shared timer digit style and optional image/video scenery |
| Statistics Select/Listbox | Native select in app/stats/page.tsx | OS-owned popup for the finite annual heatmap year range; browser geometry and keyboard behavior accepted |
| Locale | I18nProvider | English and Spanish, including new companion copy |
| Homepage navigation | Navbar compact variant | Shared navigation disclosure; outside click and Escape dismiss; Escape restores trigger focus; guests retain navigation and login |
| Workspace dock tooltips | HomeWorkspace / app/globals.css | Localized panel labels appear to the right on pointer hover or keyboard focus, remain hoverable, and dismiss on Escape, blur, pointer exit or activation; mobile menu keeps visible labels |
| Timer help | PomodoroOverview / WorkspaceWindow | Full heading and overview render in the initial server HTML independently of workspace loading/auth; one persistent copy in the window. Question-mark dock button opens it; close, Escape or dock toggles dismiss; always closed on page load and excluded from saved open panels |
| Workspace overlays | WorkspaceWindow | Compact non-modal windows; default position beside the left dock, saved positions take precedence; pointer/touch dragging and resizing with keyboard arrows; viewport bounds; click/focus stacking; Escape/close/dock dismissal; mounted content preserves drafts; position and size persist per window in localStorage and fit the viewport on reopen |
| CRUD / permissions | Existing task, room and auth services/API routes | No workflow or permission changes |

## Guest registration invitation

PomodoroTimer counts completed WORK sessions for guests, excluding breaks and cancelled
timers. GuestSignupModal appears once after the second completion per browser, with
deduplicated session IDs in `pomo:guest-signup-prompt:v1` and an in-memory fallback.
Its native modal dialog owns focus containment, background isolation and Escape dismissal;
existing pixel tokens own presentation. The registration action closes the invitation
before opening AuthModal in register mode. Guests may dismiss and continue focusing;
auto-start behavior is unchanged. English and Spanish copy follows I18nProvider.

## Native mini timer

The mini timer opens only from a user click in a supporting secure browser context.
Unsupported browsers and rejected opening requests receive localized inline feedback;
there is no popup fallback promising always-on-top behavior. Browser chrome owns window
movement, resizing, closing and returning to the main tab. Closing or pressing Escape
inside the mini window leaves the timer running; unmounting the owning timer closes it.
It is never reopened automatically. Shared TimerActions preserves Stop/Reset labels
and the existing session lifecycle, with pending operations disabling actions in both
views. The existing useTimerSync interval pair runs on the mini window while open and
returns to the main window on close; no second countdown or session is created.
The mini window reuses TaskPicker and useTaskMenu with its own disclosure state and
the shared selected task. As on the main timer, choose or clear a task before starting
a work/time-tracking session; existing sessions keep their task binding. Portals,
outside clicks and viewport measurements use the trigger's owning document/window.
Escape dismisses an open task menu first; a subsequent Escape closes the mini window.

## Companion rules

A new companion starts with 65 fullness, 75 happiness, 70 water and no food. A successfully
saved completed focus session awards one food per 25 minutes (minimum one for sessions
of at least one minute) and experience equal to its whole focus minutes. A stopped
TIME_TRACKING session awards only its actual whole worked minutes, after successful
save. Cancelled regular pomodoros and breaks award nothing. Session IDs deduplicate
rewards within the retained local history; the existing timer guards duplicate completion.
Historical server sessions are not imported. Level increases every 100 focus minutes;
stage changes at levels 3 and 5. The garden gains a flower at level 3.

Feed consumes one food and restores up to 30 fullness. Pet restores up to 25 happiness;
water restores up to 30 water, each with a separate 30-minute cooldown. Full meters
disable their corresponding action. Fullness declines by 2/hour, happiness by 1/hour,
water by 1.5/hour, clamped to zero. Time away never kills the companion or removes XP.
Needs refresh when the panel opens, every 30 seconds and on focus. Storage events refresh
other open garden tabs. This is a shared companion per browser, not account/cloud sync;
clearing site storage resets it. Cross-tab simultaneous mutations have localStorage's
last-write-wins behavior, not transactional server guarantees.

Care stays in place, updates the corresponding meter, briefly changes the character's
expression, and announces localized feedback. Unavailable food and cooldowns have
visible explanations. Storage unavailable: actions continue in memory and the footer
explains the progress will not survive closing the page.

## Verification

Below 720px, Navbar's compact disclosure moves to the top left and owns access to
all five workspace tools; HomeWorkspace supplies the same actions as the desktop dock.
Tool selection dismisses the menu and focuses the window. Closing from inside a
mobile window restores focus to the menu trigger. WorkspaceWindow uses full-width,
bounded panels on mobile; saved desktop geometry does not constrain their layout.

Homepage chat, history, tasks and progress open through WorkspaceWindow from an icon-only left dock with separators. Multiple windows can remain open;
the background stays interactive. Closing from inside restores focus to the opener.
The shared footer and retired free-month promotion are no longer mounted in the shared layout.
The homepage occupies one viewport without document scroll; lists and windows own
internal overflow, with internal timer overflow as a fallback for very small screens.
No new remote searches or server mutations other than existing session saves.
Static review covers completion vs cancellation, break exclusion, cooldown guards,
no-food guard, persistence fallback, locales and responsive rules. Browser verification
is pending because the user requested to run and test the project themselves.

The homepage companion is temporarily commented out; its implementation and stored state remain intact.

## Leaderboard workflow

`app/api/stats/leaderboard/route.ts` remains authoritative for ranking and totals.
`/leaderboard` includes only entries with positive focus minutes, ordered by the server's
rank; work and time-tracking sessions retain their existing counting rules.
`/users` permanently redirects to `/leaderboard`, preserving query parameters.
The separate Rank column uses lifetime experience and the shared `getRank` thresholds.
The existing API returns the complete dataset, so search and 100-row pagination are
local. Period, offset, applied dates, query and page persist in URL parameters using
replaceState; popstate restores the view. Period/search changes reset to page one;
out-of-range pages display the last available page. No server paging is implied.

The existing DayPicker owns calendar navigation and range selection. Its expanded
inline region is non-modal: the page remains available and Tab follows document order.
Draft dates never request data until Apply; Cancel/Escape discard them on reopening
and return focus to the trigger. Request cancellation guards stale responses, a
20-second timeout offers recovery, and Retry retains filters. Loading/error states
hide stale totals and personal ranking. Profile navigation uses native links to
`/user/[id]`; search has an explicitly labeled clear action returning input focus.
English/Spanish messages and numeric/date formatting follow I18nProvider; shared
Navbar, buttons, focus and scrollbar tokens retain their canonical owners.

## Statistics presentation

`app/stats/page.tsx` retains `/api/stats` and `/api/tasks/sessions` as its data
owners, with existing Pro gating and AuthModal/PaywallModal flows. Navbar compact
variant owns navigation, LatestActivity owns session history. The native year select
keeps platform-owned popup behavior. The existing activity-period disclosure uses
buttons with expanded state, Escape dismissal and trigger focus restoration.
The annual heatmap preserves keyboard focus and date/value labels. Route styles
use global theme and scrollbar tokens; page scrolling remains natural.

## Online session data

Per the user's socket-only online-list requirement, `hooks/useSocket.ts` and
`socket-server/src/index.ts` own the list consumed by `ActiveSessions` on home and
room screens. The list uses in-memory socket snapshots only, including public
profile metadata and running/paused timer state. Empty snapshots and disconnects
clear stale rows. Reconnect republishes the current timer; another open tab can
republish the same timer when its owning socket disconnects. Session history and
own-timer restoration retain their existing API owners. The retired active-list API
also supplied admin-only registration dates; these are no longer shown in online
cards and are never added to the public socket payload.

Timer ownership is fixed when the local session starts. Changing identity clears
that local timer and its service-worker countdown; it does not cancel its database
record or publish it under the next account. Same-account profile changes still
refresh the public snapshot. Pending activity is sent only under its original owner.

Start/end activity uses an acknowledged, retried queue in the current tab. Replayed
starts cannot repopulate online presence, and the server deduplicates lifecycle
operations by session ID. Chat-message linkage lives separately from the online
list, so reconnect and an immediate stop during start-message persistence retain
correct activity cleanup. Recovery is in-memory: the client queue lasts until page
reload, and server activity/deduplication expires seven days after a session is no
longer online (or on server restart). Chat database persistence remains best-effort.

## Search landing workflows

`components/seo/SeoLandingPage.tsx` owns the server-rendered English landing content.
`SeoWorkspace` reuses PomodoroTimer, TimerControls, SettingsModal and ActiveSessions;
there is no separate countdown, session service, room membership or presence source.
The page presets initialize only an idle timer once per route mount, never overwriting
an active/paused session or later settings edits. Landing Reset is a label variant
of the existing stop/cancel operation, with the same persistence and feedback.
Timer and presence controls retain the user's English/Spanish locale, marked by a
local lang attribute; the surrounding editorial content remains English.

In-page CTAs navigate to the real timer. Room CTAs navigate to the existing directory;
they neither create rooms nor synchronize other participants' timers. Existing account
and Pro workflows remain authoritative. InitialLoader does not cover public landing
copy. Timer readiness waits for authentication, while disconnected live activity has
an explicit unavailable/reconnecting state and the existing socket manages recovery.
Only static inspection and lint/audit are performed; browser, build, and typecheck
verification remain excluded by the user's instructions.

## Daily habits

The requested habits feature is owned by `app/api/habits` and the Habit / HabitCompletion
models in `prisma/schema.prisma`. `resolveTaskUserId` preserves the existing task
identity contract for authenticated and anonymous users. Reads and mutations are
owner-scoped; upgrading the same anonymous user preserves their habits. Logging into
an existing account follows existing task behavior, without merging guest data.

| Capability | Canonical owner | Behavior |
| --- | --- | --- |
| Habit CRUD and feedback | components/Habits.tsx, hooks/useHabits.ts | Shared checklist, pending locks, inline errors, stable live status, retry |
| Habit name form | HabitNameForm in components/Habits.tsx | Labeled native text input, explicit validation, retain failed submissions |
| Habit history dates | lib/habits.ts, Habits | Local calendar date keys, seven-day button grid, native table, no date picker |
| Quick access | HomeWorkspace, WorkspaceWindow, Navbar | Existing dock/disclosure and non-modal window behavior |
| Theme and scrollbars | app/globals.css | Existing runtime tokens, global scrollbar baseline |

Every habit is daily. One date-only completion per habit can be set or undone;
repeated writes of the same desired state are idempotent. Creation uses a client
operation ID to prevent duplicates when retrying an uncertain request. The browser's
local calendar owns today, refreshing after midnight and on focus. Future dates and
dates before creation are disabled. Current streak includes yesterday when today
has not yet been completed. Archival preserves all history; Restore is available in
the archive section. No permanent delete is introduced.

SWR owns identity-separated caching and focus/minute refresh. Pending writes preserve
controls and show errors without claiming success. Changing identity hides the prior
account's list. History renders all personal habits in week-sized columns; horizontal
scrolling belongs to the table wrapper. Empty, loading, failure and success states are
shared between the full page and workspace panel. The personal route is not indexed.

Verification is static only per user instructions. Targeted ESLint and Prisma client
generation are allowed; running the application, builds and tsc are excluded. The
schema migration must be deployed before the new API is used.

## Additional statistics route

`/statistics` preserves `/stats`; its read-only `/api/statistics` uses the same bearer
identity and owner-scoped PomodoroSession records. Existing `/stats` Pro behavior is
preserved: the weekly overview is available to authenticated users, while detailed
analytics require active Pro access, checked on the new endpoint. Navbar, AuthModal,
I18nProvider, global scrollbar tokens, and `lib/ranks.ts` remain canonical owners.
There are no writes, schema migrations, new billing rules, or fabricated user records.

`lib/statistics.ts` aggregates positive effective minutes using `lib/sessionStats.ts`,
including manual stops and time tracking. Completion counts include only COMPLETED
focus sessions. The browser's IANA timezone determines calendar attribution; weeks
begin Monday and current-week totals compare with the full previous week, labeled as
in progress. Days use the established end-date attribution. Time-of-day distributions
weight session start hours by effective minutes, since pause intervals are not stored.
Timeline blocks represent recorded start/end windows, including pauses, and say so.
Break averages are nullable and use actual break sessions. Projects are explicitly
grouped by task name; the top five plus Other preserve the complete distribution.
The score is a disclosed 60-point active-day + 40-point completion-rate habit indicator;
XP and rank use the existing persisted experience, without introducing separate levels.

The map has 3/6/12-month view controls, one keyboard tab stop with arrow/Home/End
navigation, and persistent selected-day details. Timeline and task selections expose
the same details to keyboard and touch users as their hover titles. SWR isolates data
by token/user/timezone, refreshes on focus/minute, and bounds requests to 20 seconds.
Authentication failure hides data and provides sign-in; loading, empty, error/retry,
stale-refresh and Pro states are explicit. New-user empty states return to the timer.
Only static review, targeted lint and design audits are run under the user's instructions.

## Timer appearance

AppearanceSettings follows the native modal pattern of GuestSignupModal: focus is
contained, the page is inert, Escape/close/Done dismiss, and focus returns to its
trigger. Image choices load and decode the full-size asset before applying and saving.
The pending gallery tile shows a spinner while the previous background stays visible.
Only the latest choice may apply; reset and cross-tab restore cancel pending choices.
Failures preserve the previous background and offer a localized retry after a bounded
20-second wait. Other appearance changes apply immediately; the footer says they save automatically.
Reset restores the default background, pixel face and video playback preference.
Native radio groups own arrow-key choice; there is no authored select popup.

AppearanceProvider restores validated catalog IDs after hydration. The versioned
`pomo:appearance:v1` localStorage record contains only background, font and pause state.
Storage failures keep choices in memory and show an inline notice. Storage events
sync tabs, using the browser's last write; settings do not change timer/session state.
No account, database, room-membership or billing change is involved.

WorkspaceBackground is mounted by the home and search timer shells. Only the chosen
full-size scene loads; the settings gallery uses still thumbnails, never preview videos.
Videos loop muted, pause with document visibility, and use a static poster with reduced
motion. Playback controls are available in the appearance dialog only; no playback button overlays the workspace. Media errors and
autoplay rejection have localized feedback and retry; a 20-second loading timeout
prevents indefinite pending feedback. Posters/page colors remain readable fallbacks.
Source links lead to the corresponding Mixkit item. Asset provenance lives in
`public/backgrounds/README.md`. TimerPictureInPicture observes the same digit choice.

Verification remains static: no application launch, test build or tsc, per user request.

## Community profiles and rooms

Room creation/settings and destructive confirmations use `CommunityDialog`, a native
modal with contained focus, Escape/close dismissal and focus restoration. Pending
mutations disable duplicate submission and dismissal. Privacy uses native radio
groups; required room names receive inline feedback and focus. Existing APIs, Pro
gates, membership behavior and server-owned permissions remain authoritative.

Room and member destinations are native links. Owner-only invitation search debounces
input, handles composition, cancels obsolete requests and exposes loading, empty and
error states. Member and wall-message deletion controls remain visible for touch and
keyboard users. Failed deletion keeps its confirmation open with feedback.

Profiles use cancellable, bounded initial reads and explicit loading/error/retry
states. Missing statistics are unavailable rather than fabricated zero totals. The
yearly map has one tab stop, arrow/Home/End navigation and persistent selected-day
details. Wall posting preserves its draft on failure and provides a visible character
count. `/profile` resolves to `/user/[id]` after authentication; guests can sign in.

Shared owners remain Navbar, AuthModal, PaywallModal and the theme tokens. Validation
for this redesign is source review, targeted ESLint, CSS parsing and static design
audits; browser layout and runtime flows require the user's own application testing.

## Rank-up feedback

`components/NotificationToast.tsx` owns toast presentation and dismissal; its `rank-up`
variant occupies the top-right corner. `components/RankUpToast.tsx` listens to the
existing sessionService `rank-up` event, queues distinct rank increases and suppresses
repeat ranks for the current account during this mount. Account changes clear the queue.
The authoritative XP/rank calculation remains the session API and `lib/ranks.ts`.
Cards dismiss after eight uninterrupted seconds, restarting the timer after hover,
keyboard focus or a hidden tab. Close and focused Escape dismiss manually; no focus
is stolen and the workspace remains interactive. A stable polite live region announces
the achievement. English/Spanish copy and rank names follow I18nProvider. Earned rank
remains available in the existing progress/profile views after the toast disappears.

## Compact account navigation

Navbar owns the shared two-part account/menu control. With unread notifications, the avatar is a button opening the existing notifications
panel (and its containing menu in compact navigation). Without unread notifications,
it retains the profile link or account menu; guests retain the AuthModal button. Its account
preview opens on hover/focus, stays reachable under the pointer and closes on pointer
exit, blur, Escape or activation. Opening navigation dismisses the preview. The same
account details appear in the menu on narrow/no-hover devices for touch access.
Navigation exposes the current route with aria-current; ThemeToggle owns the menu
switch variant and retains the existing theme store and persistence. RankAvatarFrame and lib/ranks.ts
remain the frame and progress owners; no new account requests or data are introduced.

## Timer settings presentation

SettingsModal reuses CommunityDialog with the timer-settings variant. Native modal
behavior owns focus containment, inert background, Escape and focus restoration;
its optional backdrop dismissal requires a press and release on the backdrop.
Duration fields retain the existing draft/Save and normalization behavior in
PomodoroTimer. Mode and auto-start changes retain their existing immediate behavior.
Running timers disable mode changes with a visible explanation. Without Pro, the
mode switch is disabled and the Pro action sits above it. The Pro action
closes settings before opening the existing paywall/signup flow so the native dialog
cannot cover that flow. Saving disables repeat submissions and dismissal until the
existing save callback finishes. No persistence, session or entitlement rules change.

## Ambient audio

`useAmbientSounds` is owned once by HomeWorkspace, independent of timer state and
panel visibility. AmbientAudio owns one lazy AudioContext, a cached decoded buffer per requested
track and one looping AudioBufferSourceNode per playing track. Decoded PCM gets a
two-second wrap crossfade after trimming 50ms from each edge; looping runs on the
audio clock without JavaScript timers. GainNodes provide independent volume and a
250ms fade-in; stopping pauses immediately. Generation
checks ignore superseded fetch/decode/resume results. Each sound key toggles independently; closing the
panel preserves playback; workspace unmount aborts pending fetches, disconnects nodes, clears buffers and closes
the AudioContext. OS/browser suspension stops sources and exposes explicit resume.
Browser-local preferences restore validated selections and levels without autoplay.
Play saved mix is the explicit resume gesture. Source/playback failures are inline
per-track errors with Retry and never stop other tracks. No files preload until
requested. Master volume multiplies individual levels without changing them.
WorkspaceWindow owns Escape, focus restoration, mobile placement and resizing;
one native master-volume range and aria-pressed sound buttons own keyboard interaction. Runtime browser
and playback verification is left to the user per repository instructions.

## Project journal extension

The user's project-journal specification is implemented by `docs/project-journal.md`,
`prisma/schema.prisma`, and `lib/journal/*Api.ts`; this extension adds server schema and
authorization rules beyond the earlier visual-only redesign.

| Capability | Canonical owner | Source and behavior |
| --- | --- | --- |
| Journal permissions/privacy | lib/journal/server.ts and domain API modules | User specification §§17–19, 28; owner-only writes and public-project gates on every public read |
| Focus attribution | PomodoroSession.projectId, sessionService, lib/journal/stats.ts | Completed WORK/TIME_TRACKING only, existing effective-minute expression, UTC day/week boundaries |
| Journal forms | FormFields, useJournalMutation, UnsavedChangesGuard | Explicit labels and validation, preserve failed inputs, block double submission, safe cancel/delete |
| Journal Select/Listbox | Native select | OS popup geometry intentionally accepted; simple named project/status/type choices, no authored appearance removal |
| Journal Date | Native input[type=date] | OS picker accepted; ISO date values validated on server, UTC attribution |
| Journal feedback | NotificationToast / JournalToast | Existing toast renderer; persistent inline error is also provided |
| Journal images | /api/journal/images | Owner/private or currently published parent gates, no-store; see attachment lifecycle in docs/project-journal.md |
| Public/owner collections | Profile tabs and JournalLists | URL page parameters, bounded requests, explicit previous/next, no infinite feed |

Project create/edit returns to My projects. Private/draft post saves return to My updates;
public publication opens its stable post URL. Profile saves open the new public profile.
Deletion returns to the corresponding owning list; focus sessions survive project deletion.
There is no auto-publication, automatic follower notification, or inferred moderation role.

## Monthly recaps

`WrappedProvider` owns account-scoped loading, history and the global viewer.
`CommunityDialog` owns modal accessibility; `WrappedViewer` owns explicit story navigation.
`MonthlyRecaps` uses a native month input (OS picker ownership) on both statistics pages
and `/journal/monthly`; `/journal/weekly` redirects there. The API validates completed
calendar months. Session completion dates use the browser IANA timezone; snapshots
are immutable and scoped to the authenticated user and first day of the month.

`NotificationToast` owns the monthly-wrapped top-right invitation. Server `notifiedAt`
claims deduplicate delivery across devices; `viewedAt` changes only on explicit opening.
The notification is saved before delivery and stays unread in NotificationsMenu after
closing or timing out the toast. Opening from the toast, message or archive acknowledges
it; failed loads preserve the unread message and offer another attempt. Zero-focus
months do not send notifications. Export includes aggregate metrics only.

## Achievements

Source: user-provided Achievements System brief; implementation rules and deployment
are recorded in `docs/achievements.md`. `lib/achievements` owns definitions, progress,
server evaluation and weekly jobs. Database triggers capture reliable new events.

The public profile previews the three latest unlocked achievements as icon/name buttons.
The disclosure opens the Achievements tab with all unlocked achievements newest first.
The tab, category and optional full-catalog status filter persist in the URL.
The finite catalog renders all matching definitions when explicitly selected;
no pagination or search is needed. Only the account owner receives locked progress.
Manual featuring and reordering are not supported; the details dialog is read-only.
Public responses omit project metadata, task totals, coworker IDs and secret conditions.

CommunityDialog is the canonical details modal; it restores focus to the opener.
NotificationToast groups unlocks and links to the profile. Server claims deduplicate
across tabs; client/server focus state defers notifications during a focus session.
Pending unlocks survive reloads. Loading, failed loading with retry, no-results,
locked, secret and unlocked states are represented explicitly.
Runtime checks remain for the user: do not run builds, the app, tsc or tests.

## Guest profiles and chat access

Source: user request dated 2026-10-06. An anonymous database profile is created only
by starting a timer session through `POST /api/sessions`. Task and habit APIs resolve
existing profiles without creating them; a guest with no profile reads an empty habit
list. Task/habit writes require an existing profile or a registered account.

`Chat` preserves the draft and opens the shared `AuthModal` in register mode when a
guest submits. User-authored messages and typing require a registered account;
`/api/chat/messages` and the socket server verify the author. Timer system activity
and reading chat remain available to guests. A failed message save restores the draft
without broadcasting an unsaved message. Verification remains static per user policy.

## Email registration validation

AuthModal owns sign-up fields and inline, English/Spanish error feedback through
I18nProvider. lib/registrationValidation.ts shares required-field, email, username,
password-length and password-confirmation rules between AuthModal and
app/api/auth/register/route.ts. Username normalization is also reused by lib/username.ts.
The existing minimum password length remains four characters.

The API returns field error codes for validation (400) and occupied email/username
(409), including unique-constraint conflicts during creation. useAuthStore forwards
these errors to the form. Email availability ignores letter case. Invalid submission
preserves values and focuses the first invalid field once inputs are enabled.
Confirmation is required only for email registration, stays masked by default, and is
never stored. Pending submissions disable inputs and block duplicate requests.
