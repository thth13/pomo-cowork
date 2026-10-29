---
version: alpha
name: Pomo Pocket Garden
description: A shared focus workspace inspired by a moss-green handheld pixel game with tomato-red accents.
colors:
  primary: '#b94e3e'
  tomato-soft: '#f3e5de'
  tomato-ink: '#983e32'
  growth: '#647b5b'
  background: '#f1efe7'
  surface: '#fbfaf5'
  screen: '#e1e6d6'
  ink: '#303a32'
  muted: '#656d61'
  border: '#b0b5a6'
  shadow: '#d0d3c6'
typography:
  sans:
    fontFamily: 'Inter, system-ui, sans-serif'
  display:
    fontFamily: 'Press Start 2P, Courier New, monospace'
rounded:
  DEFAULT: '2px'
  lg: '3px'
spacing:
  section-gap: '28px'
  page-max: '1240px'
---

# Pomo Pocket Garden

## Direction and context

Product workspace for people doing focused work together. Preserve timer, task, room,
chat and statistics workflows from README.md and their existing services. The user
requested a site-wide pixel redesign and a work-fed tamagotchi inspired by the supplied
cream sprout with a leaf satchel. This is the approved new visual identity.

The homepage signature is a large, unboxed pixel timer on a continuous quiet surface.
The default background uses a faint 32px grid with soft sage and tomato washes at the edges;
a page-colored central wash keeps the timer readable. All default layers derive from existing
theme tokens, remain static, and disappear in forced-colors mode.
The pocket garden is temporarily commented out at the user’s request. Keep the surrounding
product calm and readable; avoid arcade neon, glossy gradients, round timer rings,
and pixel fonts for dense text. Existing supported locales are English and Spanish;
new copy follows I18nProvider through lib/i18n/garden.ts. No Japan-specific market scope.

## Runtime ownership and mapping

Runtime tokens remain canonical (model B). This document mirrors them.

| Role | Runtime owner | Consumers |
| --- | --- | --- |
| Background, surface, screen | app/globals.css --pixel-page, --pixel-paper, --pixel-screen | Page, panels, timer, garden |
| Text, muted, border, accent, shadow | app/globals.css --pixel-ink, --pixel-muted, --pixel-line, --pixel-accent, --pixel-shadow | Shared pixel components |
| Existing utility adapter | tailwind.config.js neutral, moss and tomato palettes | Existing routes, forms, dialogs |
| Display face | app/globals.css --font-pixel | Heading, timer, pet name, brand |
| Body face | app/layout.tsx Inter | Body, controls, dense data |
| Spacing, shape | app/globals.css garden layout and shared utilities | Page grid, cards, controls |
| Scrollbars | app/globals.css --pixel-scroll-* | All app scroll surfaces |
| Chrome extension palette | scripts/extension-tokens.mjs → chrome-extension/tokens.css | Generated from app/globals.css; popup and action badge share the same exported palette |

Neutral gray/slate/zinc utilities use warm stone and muted sage. Rose and primary
brand accents use the shared muted tomato palette; red retains danger/error semantics.
The latest color refinement reduces competing red and green surfaces: backgrounds are
warm off-white, headers are neutral, timer digits are dark forest, and the LCD and garden
use soft sage. Tomato is reserved for primary actions, selected navigation and progress
accents. Need meters and the companion remain green. Outlines and hard pixel shadows
are softer without changing the pixel geometry.

Tomato runtime roles are --pixel-tomato, --pixel-tomato-hover, --pixel-tomato-soft,
--pixel-tomato-ink; --pixel-growth owns green need meters independently of the brand
accent. The dark variant uses charcoal-forest surfaces (#1c2320, #252e28, #333f34),
pale ink (#eceee4), muted coral accents (#e39a87) and sage meters (#a7bc91).
Artwork retains its limited palette; the scene background is desaturated in both themes.

## Layout and components

The `/uzerz` directory overlays a small green online dot at the bottom right of each
avatar, including initial placeholders. `UserOnlineIndicator` reads the shared
connection store, follows live presence updates, and hides while disconnected.
Its accessible text and tooltip use the active locale's existing online label.

The Chrome extension is a 360px pocket timer in the same paper/sage/tomato palette.
It uses a compact inset LCD, tabular Courier digits and system body typography so it
requires no remote fonts. It reuses the site's favicon assets. The account row,
primary timer action, three quiet underlined mode buttons and settings disclosure remain compact.
The synchronization status sits to the left of a compact outlined nickname chip; the chip opens an anchored sign-out popover
with Escape, outside-click dismissal and keyboard focus restoration. Time tracking
is a square switch inside timer settings; enabling it hides the three Pomodoro modes.
Sign-in uses the existing site AuthModal and a narrow account-authorization page;
after authorization the extension talks directly to the server without a site tab.
All controls retain visible keyboard focus; English/Spanish follow the language
selected at account authorization. A native task select precedes the actions and lists
unfinished account tasks from `/api/tasks`; Chrome owns its popup geometry and keyboard
interaction. The LCD contains no task caption; task names appear only in the picker.
Running sessions show Pause and Stop; paused sessions show Resume and Stop.
Task selection persists per account across completed sessions and popup reopening.
Empty task lists hide the picker. Task-list
refreshes preserve selection and report loading/failure independently of timer sync.
The extension's generated palette remains independent of transient website themes.

The homepage replaces the full header with a small fixed two-part account/menu control
at the top right. Its left avatar links to the profile and reveals account details on
hover or keyboard focus; the right Menu button opens navigation. Both share a paper
surface, fine border and a vertical divider. Guests see a sign-in avatar button.
The account card contains name, email, Pro status, localized rank and XP progress;
the same details remain in the menu for touch access. Both overlays are anchored
without changing the control geometry. The disclosure follows workspace-window styling:
a sage header, pixel Menu caption, compact Inter navigation, consistent outline icons,
fine section dividers and a soft tomato inset marker for the current page. ThemeToggle's
menu variant uses a square sun/moon switch on the same tokens. Desktop account details
live in the avatar preview; narrow and no-hover layouts also show them in the menu. It reuses Navbar navigation, account actions, notifications, online status and
theme controls; guests can navigate and sign in. The settings page, leaderboard, statistics, user profiles,
public @profiles, project list, project create/edit and public project pages reuse this
compact menu; other routes retain their header. Journal pages with compact navigation
reserve 84px plus the top safe-area inset above their content, matching leaderboard.
These journal routes and leaderboard share `BackToTimer`, an outlined arrow link
to `/` with English/Spanish labels; journal places it above the page content on the right.
At widths up to 719px, this same menu moves to the top left and includes the five
workspace tools with icons and localized labels. The desktop dock is hidden, and
the timer uses the full available width with safe-area padding. Selecting a tool
closes the menu and focuses its window; closing the window restores menu-trigger focus.
Mobile windows span the available width below the menu, with bounded internal scrolling
and 44px title/close controls. Dragging and resizing are desktop-only; mobile CSS
overrides saved desktop geometry without replacing the stored size.
The homepage centers a 640px timer. Currently Working is a permanent right-side rail,
part of the page rather than a floating window. At 1440px and up, symmetric side columns
keep the timer centered independently of the rail. The rail is up to 400px wide and
640px tall, with a subtle left divider, plain heading and online count. From 960px the rail sits beside the timer; narrower screens
place it below the timer in a bounded grid row, except on mobile (up to 719px), where
the page scrolls naturally and the full session list has no height limit or internal scrollbar.
On desktop the rail aligns to the right
edge of the page content without auto margins; equal inline padding centers the empty state.
The rail opens by default and remembers its collapsed state in browser localStorage.
HomeWorkspace owns the disclosure; ActiveSessions keeps one live session list mounted.
Collapsed desktop width is 96px with avatars, green presence dots and elapsed mini timers;
tablet screens use a horizontal avatar strip. On mobile (up to 719px), the rail spans
the timer's available width with a 44px disclosure button and no visible Currently
Working title. Its chevron points up to collapse and down to expand; collapsing leaves
a horizontally scrollable strip of avatars, presence dots and elapsed mini timers.
The online count and disclosure share one 44px header row in both states; the button
is anchored over that row rather than taking a separate row. Mobile coworkers use
32px avatars, 10px vertical padding, 4px detail gaps and a 3px progress track.
HomeWorkspace animates the measured content height vertically for 320ms, keeping
ActiveSessions mounted; reduced motion disables the height and chevron animations.
The mobile grid uses a shrinkable single column and natural content heights.
The desktop page grid stays fixed during a 280ms
width transition, and reduced motion disables transitions. The disclosure remains
available in the empty state. Colors reuse pixel and local scenery roles.
Only real sessions appear in the rail and online count; mock participants are removed.
Guest session names use the localized Guest label and the final four characters of
their existing username, with a quiet monospace suffix. `GuestAvatar` replaces the
shared G placeholder with a mirrored pixel portrait derived from the user ID, using
the existing screen and growth tokens. Both session layouts and chat session-start
messages reuse this treatment through `ParticipantName` and `GuestAvatar`;
stored usernames and profile routes retain their original identity.
Coworkers form a vertical list with 40px avatars on the left and names, activities,
time, status and a remaining-time meter on the right. Time tracking shows elapsed time
without a fictional remaining-time meter. The current user keeps a tomato edge accent and
You label. Active Pro accounts show the profile's small crown icon beside the name;
the session snapshot carries the same active-access check used by the account UI.
Room pages keep their detailed session cards. Above 719px the list owns vertical scrolling.
Flat rows use fine dividers, with the time aligned opposite the status. Pixel digits and slim progress tracks carry the identity. The English H1, “Online Pomodoro Timer for Focused Work”, and Pomodoro overview
live inside the About the timer workspace window, opened by the question-mark dock
button, available only to signed-out visitors in both the dock and mobile menu.
Signing in hides the trigger and the window while retaining its server-rendered content.
The window is closed by default and never restored on page load, even if left
open on a previous visit. Its heading and full content render in the initial server HTML,
including while the workspace is loading or checking authentication; there is one copy
inside the shared window, with no click-dependent content loading.
Its content uses Inter and existing tokens and is excluded
from automatic DOM translation. The trigger and window controls follow the active locale. A compact inline Current task picker sits directly
below Start/session actions and above the session-type controls.
Chat, history, tasks and Your Progress open from a fixed vertical dock at the left.
Its five icon-only buttons have fine separators, localized accessible names and styled
tooltips to the right on hover or keyboard focus, dismissed on Escape, blur, pointer exit
or activation. Tooltips use existing pixel tokens and stay above workspace windows;
the progress tooltip includes the current experience rank. Above 719px the homepage has no document scrolling; mobile uses document scrolling through the timer and full session list. There is no inline introductory text. The timer
workspace occupies the viewport with safe-area clearance and compact timer spacing
on small screens. Lists and floating panels scroll internally; exceptionally small
viewports allow internal timer scrolling to keep controls reachable. Other routes keep
their existing document scroll. The shared footer is removed.
PocketGarden stays commented out rather than deleted.
WorkspaceWindow owns compact, non-modal floating panels (360px wide, at most 480px tall).
By default they open just to the right of the left dock, aligned with its top and
a small stagger; viewport bounds still apply. Saved positions take precedence.
Multiple panels may stay open.
The sage title bar is a pointer/touch drag handle with arrow-key movement; dragging and
viewport resize keep windows within screen bounds. Click/focus raises a panel. Escape
closes the focused panel; the dock toggles it. No backdrop, page scroll lock or focus trap.
Restoring windows on page load does not move focus. Opening from the dock focuses the
title handle; keyboard focus uses a neutral background and underlined title without an outline.
Bodies scroll internally. Data panels mount on their first opening and remain mounted
afterward to preserve tasks and drafts. Closed panels suspend data fetching, polling
and chat subscriptions; opening revalidates their data. Help remains in the initial HTML.
Chat uses the same seven-message skeleton while its lazy component and message history
load, with the regular chat frame height, shared shimmer tokens and reduced-motion support.
ActiveSessions uses the existing shared socket for visible collapsed avatars/timers;
reaction snapshots load only when the rail expands or its context menu opens.
AuthProvider restores and persists the timer task selection independently of TaskList.
Notifications keep one initial unread-badge request, coalesce update events, and
revalidate stale data every five minutes while the tab is visible. Achievement sync
also uses a five-minute fallback plus debounced session/task events. Wrapped reuses
the loaded monthly report while toast delivery waits for another overlay to close.
The NotificationsMenu includes a permanent View all notifications link to `/notifications`
in a separated footer below the list: a compact muted text link with a small right arrow,
including when the unread list is empty. The history page reuses compact Navbar,
PersonalNavigation (as on Statistics and Profile), the personal-page frame and existing pixel notification rows.
Notifications share one bordered paper/glass block with fine dividers between rows.
Compact type badges sit after the notification title, with the date aligned right
and wrapping below on narrow screens. Type badges use green invitations, gold rank upgrades, blue wall messages, purple
Premium grants and tomato recaps; local accents mix with the runtime ink token to
adapt to light, dark and scenery themes. Bold titles, inset message rules and emphasized
sender/month metadata separate content roles without adding cards inside the list.
Wall messages omit the profile action; Open recap reuses the primary notification
action button with a calendar icon, visible border and comfortable padding.
Unread rows have a darker surface; read-state text is screen-reader-only, with no
visible read timestamp or explanatory page subtitle. AppearanceProvider includes this
route in shared scenery: the list uses the existing translucent product palette and blur,
with a darker unread variant and a forced-colors outline fallback.
Inter owns dense content and the pixel face is reserved for the page heading.
English/Spanish copy lives in `lib/i18n/notifications.ts`. Runtime theme tokens own
all page colors; narrow screens wrap metadata and actions without horizontal scrolling.
Navbar links disable automatic route prefetch so destinations load on navigation.
Open/closed state persists in `pomo:windows:open:v2` and restores before the workspace
appears. Existing v1 preferences migrate; only floating panels are restored. Only known panel IDs are restored; unavailable storage falls back to memory.
Positions and user-selected sizes persist per window in versioned localStorage keys,
with debounced writes and a flush on page exit. Restored windows fit the current viewport;
invalid or unavailable storage falls back to the in-memory layout. Invisible edge and corner
handles straddle the visible border (including a small outside hit area) and support
mouse/touch resizing with directional cursors that override the global button cursor; no resize icon or footer
is shown. The bottom-right handle also supports keyboard arrows (Shift for larger steps).
Resizing clamps to the available viewport with a 280×240px minimum when space allows.
Chat fills the resized body; other window content scrolls internally. Existing runtime tokens own colors;
compact padding and hidden duplicate headings apply only inside workspace windows.

Panels have 2px outlines and hard offset shadows. Existing rounded-lg/xl/2xl/3xl
utilities share 3px corners; avatars retain round framing. Shared buttons, inputs,
navigation and dialogs retain their behavioral owners. New pet actions use native
buttons, explanatory text for disabled states and a stable live status region.

Pixel art is integer-grid SVG in PixelSprout.tsx, decorative and sharp at every size.
Sprout bobs slowly while idle, perks up while working and hops after care. All motion
respects prefers-reduced-motion. Focus rings remain visible; meters expose names and
numeric values. No progress announcements every second. Fonts have local fallbacks;
external font loading is consistent with the project's existing Google Fonts setup.

The shared layout includes a fixed Ko-fi support link at the top left, using the
react-kofi's KoFiPanel opened by “Support Pomo Cowork” in muted forest #52664B, a
provider-specific color chosen for white-label contrast and the garden palette.
The package's kofi.css is loaded before the application styles; Tailwind scans its
distribution. A native button opens CommunityDialog's kofi-support variant with the
embedded Ko-fi form, close action, Escape, backdrop dismissal and focus restoration.
The iframe mounts only while open; a separate link opens Ko-fi in a new tab if needed.
The support widget renders only after hydration and the initial auth check; the
homepage's aria-busy workspace also hides its trigger until workspace restoration ends.
The modal fits narrow/short viewports and the embedded document scrolls. Its iframe
caps at 644px to fit the coffee quantity controls and trim the blank area below the provider footer;
the external-link row uses compact 6px vertical padding. Shorter viewports retain
scrolling inside the embedded form. The user requested an
always-white shell matching Ko-fi, including in dark and scenery themes: local neutral
tokens, a 400px maximum width, 12px corners and soft shadow. The header is visually
hidden but keeps the accessible title; a circular close icon overlays the iframe's
top-right corner with a 44px target. The iframe has no surrounding padding. This explicit
variant retains CommunityDialog behavior while excluding scene glass styling. The target
is at least 44px high with visible keyboard focus. Below 720px the support trigger is hidden.
English/Spanish accessible labels follow
I18nProvider through gardenCopy; Ko-fi owns the embedded form's language and content.

The settings page reuses the compact Navbar, PersonalNavigation and personal-page frame
from statistics. Profile, timer, notifications, subscription and Save sections use flat
paper panels, fine token borders and square controls. Settings appears in the shared
PersonalNavigation with active-page styling; there is no separate visible page heading
or promotional Control center hero. `app/settings/settings.css` owns this route
presentation and consumes the shared runtime tokens. CommunityDialog owns subscription
cancellation confirmation; existing save and billing operations remain unchanged.
The profile panel follows the user's earlier reference: Account eyebrow, Own your
presence title and username chip; a 320px bordered avatar card sits beside stacked
username, email and description fields. The avatar card has a 128px preview, dashed
dropzone and pill-shaped file button. A sage visibility note sits below the fields.
On mobile the columns stack. AvatarUploader validates images against the existing
4.5 MB limit. The preview's cross marks the photo for removal on Save settings;
an inline Undo restores the current photo before saving. Avatar controls disable
while saving.
The bottom-right language control reuses LanguageSwitcher as a compact inline label
and native select without a surrounding panel or description; English/Spanish changes
apply immediately through I18nProvider.

## Native mini timer

The native mini timer opens from the top-left pop-out button on the shared timer.
Its 300×180px requested initial window keeps the pixel digits, segmented progress and Inter
controls on the existing page surface. `app/globals.css` owns `.mini-timer-*` rules;
all colors and fonts reuse runtime tokens. The window follows live theme and locale
changes, wraps controls when resized narrowly and owns natural document scrolling.
Time tracking displays elapsed time without a fictional remaining-time meter.
The mini window shows the session mode and status in a compact top row, with 10px
outer padding and an 8px section rhythm. Digits cap at 36px and actions are 32px tall.
A minimal shared TaskPicker sits directly below the digits as one 26px row with only the
selected title (or select-task prompt) and chevron. Descriptions and the repeated
Current task prefix are omitted in this variant. Its compact popup overlays content
within the mini window's viewport and never expands the window or timer layout.
The progress track stays in the digit/task group, 4px below the task row; the
action row has 12px clearance below that group. The timer group does not stretch;
the complete stack is centered vertically so hidden flex space cannot distort gaps.
Opening the mini window does not autofocus an action; keyboard focus indicators
remain available when navigating its controls.

## Verification scope

User explicitly forbids running the project, test builds and tsc. Only static source
inspection, diff checks and the design skill's static audit are authorized here.
Runtime behavior, responsive screenshots and full accessibility remain for manual
verification. Existing unrelated workflow audit findings are not assertions of compliance.

## Local practice landing pages

Ten additional English search tools use `PracticeLandingPage` and `PracticeTimer`.
They are intentional editorial variants authorised to have distinct page designs.
`PracticeLandingPage.module.css` owns their opaque page palettes, display/digit roles,
layouts and motifs; Inter remains the inherited body face. Existing Space Grotesk,
Cormorant and Bebas font variables are reused with system fallbacks. No new font
dependencies or raster assets are introduced. `data-local-timer` excludes these pages from the
existing scenery contrast and translucent panel rules in either app theme.

| Variant | Paper / soft / ink / muted / accent / line | Signature and composition |
| --- | --- | --- |
| flow | #eef5f8 / #d6e8ef / #193f50 / #486372 / #24647b / #a3bfcc | Blue horizon, wave motif, open clock instrument |
| blurt | #f4f8f2 / #e2ecd9 / #293e29 / #50614b / #3c6837 / #aebca4 | Green whiteboard frame, rough recall sketch, clock on left |
| recall | #f5f2fb / #e3dbf2 / #3a2b57 / #65567e / #694396 / #bcb0d0 | Lilac flashcard stack and separate clipped-corner timer |
| spaced | #edf6f2 / #d2e8df / #204b42 / #47685f / #276858 / #a1c2b5 | Mint return path, horizontal stages over centred clock |
| explain | #edf2fa / #dbe4f5 / #243d66 / #526583 / #315b9d / #a7b8d6 | Blue teach-back diagram, graph paper and annotation margin |
| micro | #fff7df / #f0dfaa / #493c19 / #6d5d32 / #805419 / #c8b77f | Honey lesson ticket, perforated stub, condensed display |
| offline | #273e45 / #344f56 / #edf4f2 / #c0d2d2 / #b9dcd5 / #6c8b90 | Slate phone sleeve and centred quiet enclosure |
| journal | #faf0f0 / #efdcdf / #533440 / #775764 / #874762 / #cfacb6 | Rose notebook spread, double spine, serif clock |
| tidy | #f5f2e9 / #e5e0c9 / #414831 / #5b6249 / #56662c / #b5b99d | Olive sorting bins, sturdy edges, plan to right of clock |
| read | #f0f0fa / #dddff1 / #343455 / #5c5e7b / #53568d / #b2b4ce | Lavender book spines, library slip and narrow host margin |

Motifs are static, decorative HTML/SVG derived from the task. All actual progress is
calculated from the local clock. Native stage buttons, presets and number inputs own
keyboard behaviour. The stage plan is ordered because it represents a real sequence;
stages remain manually selected and manually started. Idle → running → paused/resumed
or finished uses consistent Start/Pause/Resume/Reset labels. A completed stage offers
Prepare next stage or New session. Reset unlocks duration/stage choices. Inputs use
the existing 1–180 whole-minute boundary and inline associated errors. Flowmodoro
counts upward and prepares elapsed/5 rest with a one-minute minimum; calculated
seconds are preserved until a whole-minute override. `practiceTimerConfig.ts` owns
these ten plans, captions and stage prompts; `useLocalStudyTimer` owns clock arithmetic.

Each page mount owns its state; no account timer, persistence, session, statistics,
audio, microphone, analytics events or network calls are connected to these controls.
The site shell's existing page analytics/providers remain outside that promise.
Leaving/reloading clears the clock. No background completion notification is promised.
Status announcements occur on state changes, not every second. No new dialogs,
selectors, toasts or scrollbar systems are introduced. Page scrolling remains natural.
At 800px timer columns collapse; at 540px the motif and editorial content stack.
Focus styles, disabled/pressed states, reduced-motion and forced-colors rules are
scoped to this family. Browser/viewport verification remains manual per user request.

`seoPracticePages.ts` owns unique metadata, copy, examples, FAQ and research links.
The server component renders all editorial text and matching structured data before
client interaction. Research scope, source dates, intent separation and uncertainty
are documented in `docs/seo-practice-pages.md`; no guaranteed ranking or AI-detector
outcome is claimed.

## Editorial blog

`/blog` and `/blog/[slug]` are public content routes with document scrolling.
A small server-rendered header provides permanent links to the blog and timer;
the homepage disclosure and full Navbar link to the blog. Reading never waits for
authentication. The notebook direction uses existing pixel tokens and a restrained
pixel eyebrow/brand, with Inter headings and a 752px maximum text column.
`app/blog/blog.css` owns editorial spacing and typography; no global tokens change.
Article language is explicit in Markdown (en/es/ru/uk), including dates and article
actions; the index and editorial shell use the site's default English. The DOM
translation bridge must not rewrite editorial content. Markdown is rendered and
sanitized on the server; only explicitly published files become public routes.

The blog index uses a wider 1120px notebook composition: a large Inter headline,
a sage lead article (the latest published post), and a paper-colored practice card
whose static pixel 25:00 illustration connects reading to the actual timer. It is
an illustration, not a running session or interactive timer. Remaining articles
appear once in a three-column grid, two columns below 900px and one below 640px.
The lead section and intro stack at 640px. Article titles and descriptions remain
uncropped; metadata wraps for long translations. Existing --pixel-* runtime tokens
own all colors and both themes; --font-pixel is reserved for the eyebrow and timer
illustration. Index rules live in app/blog/blog.css, scoped through blog-index or
index-only component classes. The article reading layout stays unchanged.

## Community leaderboard

`/leaderboard` reuses Navbar’s compact menu with safe-area clearance above its content.
The introductory heading is omitted. It follows the Pocket Garden
identity with a quiet
three-metric strip, and a sage first-place card followed by the next two coworkers.
All podium links appear in rank order, including on mobile. The native ranking table
uses Inter, tabular time values, fine row dividers and a tomato edge for the current
user. A paper personal-progress panel sits beside the table and moves below it on
small screens. This is a document-scrolling route, not a floating-window workspace.
The date-range picker expands within the period panel; it uses the existing DayPicker
with token-derived colors and square selection geometry. `app/leaderboard/leaderboard.css`
owns route-specific composition; all colors and typography derive from existing global
tokens. `lib/i18n/leaderboard.ts` owns new English/Spanish copy through I18nProvider.

## Personal statistics

`/statistics` uses `StatisticsSkeleton` while the initial data loads. Its placeholders
follow the dashboard order: weekly focus/rank, annual heatmap, score/DNA, weekly chart,
records/comparison, projects and daily timeline. It reuses the live `insight-*` grids,
panel spacing and responsive breakpoints, plus the shared skeleton shimmer tokens.
Decorative placeholders are hidden from assistive technology behind one localized
loading status; reduced-motion preferences disable the shimmer.

`/stats` shares the homepage's garden background, compact Navbar and pixel display
face. It remains a document-scrolling route. A single divided metric strip places
total focus time on a sage surface; paper analytics panels use fine borders and
hard offset shadows. Charts use existing pixel tokens, square columns and restrained
tomato/sage accents; the annual heatmap grows from paper to sage in five levels.
`app/stats/stats.css` owns route composition, responsive stacking and chart surfaces.
Highcharts uses runtime CSS colors so charts follow both themes. Existing statistics
API, period navigation, task sessions, LatestActivity and Pro access remain owners
of their workflows. The locked preview feeds static sample data into the exact same
blocks, Highcharts charts, LatestActivity rows and task-session explorer as the Pro
dashboard; there is no separate simplified preview layout. It uses the same
4px blur and slight darkening as `/statistics`, and is inert for keyboard users.
Its full height remains visible beneath the existing Pro purchase card. Monthly Recaps
is omitted from both statistics routes.
The year selector retains its native operating-system popup.

## Online sessions

The shared ActiveSessions view reads only Socket.IO snapshots through useTimerStore.
An empty snapshot clears the list; HTTP and database fallbacks must not repopulate it.
Each snapshot includes the public username, avatar, experience and timer state.
Disconnect clears the local list and removes the disconnected timer on the server;
reconnect publishes the client's current timer, including pauses, before requesting
fresh snapshots. Registration dates are not broadcast publicly. Session history and
restoration of the user's own timer remain separate database-backed workflows.

## Search landing pages

The routes in `lib/seoRoutes.ts` use the document-scrolling `app/(tools)` shell.
The English copy in `lib/seoPages.ts`, `lib/seoAdditionalPages.ts`, and `lib/seoExamPages.ts`
is rendered on the server and excluded from DOM translation. Inter owns the readable headings and prose; the pixel face remains
reserved for the brand, small workspace labels, and the real timer digits.
`app/(tools)/tools.css` owns layout and spacing, using existing `--pixel-*` colors
and `--font-pixel`; no additional theme palette or font dependency is introduced.

The signature is an immediately usable shared study desk: the existing PomodoroTimer
beside a live ActiveSessions rail. Social-intent pages give that rail a sage surface
and direct access to rooms. At 800px it stacks below the timer; page scrolling stays
natural. A reserved timer region holds loading feedback while authentication resolves;
editorial content never waits for authentication. Disconnected presence is labeled
unavailable, never represented by invented participants or a zero count.

Presets apply once on entry to an idle timer: 15/5/15 for homework initiation,
30/5/15 for the half-hour timer, 45/10/20 for the 45-minute timer,
50/10/20 for focus, online study rooms and the 50-minute timer, 25/5/15 elsewhere. Active and paused
sessions keep their timing. Additional presets use 60/10/20 and 90/15/30 (long break after two rounds),
25/5/15 for 25/5, students, programmers, writers and remote work (after four),
50/10/20 for 50/10, developers and freelancers (after three), 52/17/17 for the
52/17 rule (after four), and a flexible 15/5/15 for ADHD (after four).
Developer copy targets engineering delivery; programmer copy targets coding practice.
Exam-preparation pages use 25/5/15 after four rounds by default, 30/5/15 after four
for ACT/GRE, and 50/10/20 after three for A-level/MCAT/JEE. These are adjustable
study intervals, never official section durations. Examples and FAQs distinguish
learning and error review from full exam simulations. Optional resource links render
below the explanation using the existing text-link style and point to official providers;
board-specific resources are named explicitly rather than presented as universal.
The existing settings modal remains the duration owner;
subsequent visitor changes are not overwritten by page presets. Reset on these pages
uses the shared stop/cancel operation; time tracking retains the Stop label.
FAQ disclosures are native details/summary and their full answers render server-side.
Metadata, canonical URLs, WebApplication/FAQ JSON-LD and sitemap entries are shared
in implementation, while search intent, examples, benefits, FAQs and related links
are written separately for each route. No ranking or rich-result promise is made.

About the timer includes a server-rendered Focus Tools navigation list for all registered
tools, using shared labels from `lib/seoRoutes.ts`. Links have 44px minimum height,
theme-derived hover/pressed states and visible keyboard focus. Related tools reuse
those labels, with intent-specific destinations. `app/sitemap.ts` generates the public
`/sitemap.xml` from the same tool registry, public site pages and published blog posts.

## Daily habits

`/habits` is a document-scrolling personal tracker with the compact Navbar. The home
workspace adds Habits to its left dock and mobile tool menu, opening the existing
non-modal WorkspaceWindow with today's checklist. Both surfaces use `Habits` and
`useHabits`; their shared styles live under `.habits` in `app/globals.css` and reuse
existing pixel tokens. The signature is a seven-day check grid with a quiet daily
progress strip, readable Inter habit names and a restrained pixel page heading.
History owns horizontal overflow on narrow screens; the page keeps natural scrolling.
The full page owns creation, rename, reversible archive/restore and week navigation.
English/Spanish copy follows I18nProvider via `lib/i18n/habits.ts`.

The full page adds `HabitStatistics` between the checklist and editable weekly history.
A sage completion-rate block with twenty square meter segments anchors a divided
metric strip; Inter tabular figures show check-ins, perfect days and the best streak
for 7/30/90 days. A separate 90-day activity calendar uses five sage intensities,
checks for fully completed days, and a persistent selected-date caption. A ranked
habit list shows five progress rows per page. These panels stack on narrow screens;
only the calendar owns horizontal overflow. Shared pixel tokens, scenery glass,
English/Spanish copy and the existing loading skeleton remain canonical.

The Habits workspace window opens at 330px tall, bounded by the available viewport,
with room for three compact habit rows. Desktop resizing can shrink it to the shared
240px minimum; the initial height is not a minimum height. Its Manage habits link stays at the bottom
outside the scrolling content, including loading, empty and error states. Only the
content above that link scrolls when the list outgrows the window; resizing preserves
this layout. The compact skeleton uses the same content region and keeps the real link.

## Focus statistics dashboard

Habits, projects, rooms, leaderboard and `/statistics` omit introductory page headings,
eyebrows and descriptions above their working content. Habits also omits the introductory
date. PersonalNavigation continues to identify the active page; section headings and
room creation remain available. Their loading skeletons omit the introductory heading.
The rank guide and classic statistics links sit in a paper block below `/statistics`
content in every loading, empty, error and populated state.

`/statistics` is an additional personal route; `/stats` and its existing API stay intact.
Navbar links to both. The new page uses the compact menu and natural document scrolling,
with the same cream/sage surfaces, tomato accents, 3px geometry and shared theme tokens.
Inter tabular numerals carry the large weekly total; pixel type is limited to eyebrows.
The signature visualization is a soft, data-derived weekly mountain, supported by a
contribution map and a quiet task galaxy. Circles encode task time; they are chart marks,
not a new card or control shape. No fonts, chart packages or theme tokens are added.
`app/statistics/statistics.css` owns this route's composition and responsive rules.
On narrow screens panels stack, the galaxy becomes a full-name distribution list, and
the heatmap and timeline own horizontal overflow. The score gauge uses discrete marks;
existing timer rings remain unchanged. Motion respects reduced-motion preferences.
English/Spanish copy belongs to `lib/i18n/statistics.ts`; the DOM translator is excluded.
Basic accounts see the Pro sections filled with explicitly labeled sample statistics,
blurred, slightly darkened and inert, with one sticky Pro upgrade card over the entire
preview. Each panel retains its own clipped blur. The real
summary and footer keep their actual totals; sample data stays client-side and never
replaces API data. Basic accounts with no sessions also receive this preview.
Above that preview, basic accounts see `SessionOverview`: an unblurred paper panel
with all-time focused time, work-session count and average duration.
Three equally weighted metrics share one compact row with fine vertical dividers,
muted icon labels and tabular Inter values, keeping emphasis on the weekly hero.
On mobile metrics become compact rows with right-aligned values. Empty accounts see zero totals,
an unavailable average and a timer link.

## Personal timer appearance

The timer's icon-only Appearance button sits at the top beside Settings, with a localized
accessible name and tooltip. On narrow screens the status sits below the icon row.
It opens a native modal dialog with a compact scenery
gallery and ten digit previews. The default remains Pocket Garden and pixel digits.
Six scenic landscapes, one original fantasy academy wallpaper, two animated pixel forests, three abstract gradient wallpapers and three Vercel Blob-hosted Mixkit videos provide
optional scenery; `public/backgrounds/README.md` records new asset paths and generation prompts.
`lib/appearance.ts` owns the catalog; `app/appearance.css` owns its shared presentation.
Scenery appears on home, search timer pages and product routes: rooms, leaderboard,
both statistics pages, habits, profiles, ranks, settings and journal screens.
Room headers use the shared neutral surface without room-owned gradients. Personal choice is shared per
browser; access to the three new landscapes, three gradients and five additional fonts
follows the active account's Pro entitlement. Magic Academy, Forest Campfire and
Autumn Breeze also require active Pro access. The original choices stay free.
The gradients offer peach/rose/lilac, mint/blue/cream and indigo/orchid color fields;
they are static raster scenery and use the same thumbnails, loading and contrast behavior.
Magic Academy depicts a lakeside Gothic school with steep slate towers, candlelit
windows and moonlit mist; its local JPEG and thumbnail reuse the same gallery flow.
Forest Campfire uses a lossless 1672 × 941 pixel-art PNG with CSS-animated SVG
flame accents, firelight, embers and fireflies in `PixelCampfireEffects`. The image
and effects share the same centered cover crop, keeping the fire aligned on mobile.
It remains an image catalog entry with `animation: 'campfire'`, so preloading,
failure recovery and contrast sampling reuse the existing image workflow.
`isAnimatedBackground` exposes pause/play controls for videos and animated images;
both reuse the persisted `videoPaused` preference for storage compatibility. Effects
start only after the image loads, pause in hidden tabs, and are omitted for reduced
motion. The base artwork includes a complete still fire. No video or audio is loaded.
Autumn Breeze adds a golden-hour woodland stream with wind-blown pixel leaves in
`PixelAutumnEffects`, using `animation: 'autumn'` and a matching lossless PNG.
Twenty-six deterministic leaves use layered descent, gust, sway and flutter animations;
the scenery stays still. Both pixel scenes share `.pixel-scene-effects` for cover
geometry, pause and reduced-motion rules. The gallery uses a leaf badge for autumn
and a flame badge for the campfire, with English/Spanish labels and existing controls.

Product routes render the selected media once through `AppearanceProvider` and
`WorkspaceBackground`. `app/appearance.css` maps their existing Pocket Garden
surface tokens to dark translucent glass, with light text, fine borders and an
18px blur on major panels. This keeps the scenery visible without replacing each
route's layout or status colors. The default background retains the established
paper styling; forced colors restores solid system surfaces.

Chosen scenery fills the viewport beneath the page. In background mode the existing
timer and Currently Working components use a shared dark translucent surface, 18px
blur, fine white inset border and restrained shadow. `app/appearance.css` owns the
`--scene-*` roles: a 68% dark local scrim keeps white primary/secondary text readable
even over bright imagery while preserving visible scenery. The existing gentle page
wash remains; no extra full-screen dark layer is added. Layout, dimensions, spacing,
fonts and behavior are shared with normal mode. The presence rail has 24px vertical padding in both modes so its heading clears the
panel edge; switching scenery does not resize the controls.
ActiveSessions portals its reaction picker to `document.body` so viewport positioning
and pointer interaction remain independent of the rail's backdrop blur and clipping.
The picker opens 8px to the right of its trigger, falls back to the left when space
is limited, and stays within viewport bounds. Its shell and emoji-picker variables
reuse the shared scene glass, text, border and interaction tokens when scenery is rendered.
The presence popup is filled edge to edge by the emoji picker, without a visible
heading, nested surface or outer padding; its localized Reactions name remains
available to assistive technology. The tomato action is omitted, and both the popup
and embedded picker have no border outline. Only the emoji list scrolls, using a
compact scrollbar with a transparent track and the shared pixel scrollbar tokens.
Emoji category headings use quiet 12px regular text without a separate background
or sticky behavior; the library's category geometry is retained for virtualization.

All dock windows (chat, history, tasks, habits, progress, sounds and help) share
that glass shell while scenery is active, including when opened from the mobile menu.
Local pixel-token aliases and neutral utility adapters in `app/appearance.css` keep
headings, fields, cards and scrollbars legible in either theme. Bodies stay transparent;
controls use dark insets, and the sticky sound footer uses the scene popover surface.
Window geometry, dragging, resizing and focus behavior retain their shared owners.

Incoming notification menus, rank/monthly invitation toasts and the Monthly Wrapped
viewer, Timer settings and the Appearance background picker reuse the same glass shell
and local scene text, border and scrollbar roles. Dialog headers, fields, gallery cards
and footers inherit these local roles; primary actions retain their tomato fill and
light labels. Selecting or resetting scenery updates an open dialog immediately.
`app/appearance.css` detects rendered workspace scenery from `body` so global feedback
and the native Wrapped dialog match it even outside the workspace container. Notification
rows remain translucent, with a brighter unread fill and their semantic edge markers.
This treatment is disabled in forced colors and when no workspace scenery is rendered.

The task selector uses a darker translucent inset; its portalled popover explicitly
carries `data-background-mode` from the appearance store and uses a nearly opaque
dark surface. The separate mini window retains its ordinary theme. Active tabs and filled progress segments use the semantic timer mode accent; inactive
segments remain translucent white, and Start keeps the
existing terracotta fill. The same surface roles apply to search timer pages.
Forced colors restores system surfaces, text and focus outlines without blur.

`useSceneryContrast` samples only editorial surfaces, which retain their light glass
treatment. The dock and compact account/menu control share the timer’s dark scene
surface and border; their tooltips, account preview and menu use the dark popover
roles. Navigation text, separators and interaction states inherit local scene tokens.
The timer, navigation and coworker rail use fixed light text
on their own dark surface, independent of image sampling or video frames. Main-surface
colors stay scoped to scenery surfaces and their settings dialogs; avatars and other
opaque application UI retain their theme colors.

The gallery uses native radio inputs, visible selection checks and keyboard focus;
Pro choices carry a small crown-and-Pro badge using existing paper, ink and border tokens.
Without active Pro, these tiles are native buttons that close the appearance dialog
and open the same PaywallModal used by `/statistics`, keeping checkout above all other UI.
it scrolls within a bounded dialog while the header and Done action remain reachable.
English/Spanish text follows I18nProvider via `lib/i18n/appearance.ts`.

`data-timer-font` maps pixel, system sans, Georgia, Courier New and Trebuchet MS to
`--timer-face` in `app/appearance.css`, with local fallbacks. Only timer numerals change,
including the native mini window; existing size/line-height remains stable. UI and
body typography retain their previous owners. Pro adds Orbitron, Space Grotesk,
Cormorant Garamond, Bebas Neue and VT323 through `next/font/google` in `app/layout.tsx`,
with preloading disabled. Body CSS variables map them to `--timer-face`; these same
variables follow the mini window. Font files load when a preview or selected face is used.
Video is muted and loops, with playback controls in appearance settings only. Reduced-motion users get
the poster without a video request; hidden tabs pause playback. Forced colors hides
scenery and retains system surfaces. No new palette or global theme change is needed.

## Profiles and rooms

`/user/[id]`, `/rooms` and `/rooms/[id]` share the garden background, compact Navbar,
cream/sage surfaces and existing pixel tokens. `app/community.css` owns their scoped
composition: restrained pixel headings, readable Inter content, square avatars,
compact metric strips and offset panel shadows. Room headers use the shared neutral
surface; room creation and settings do not expose a color choice. Stored room colors
have no visual effect. Personal timer scenery retains its existing scope.

The directory separates the global desk from the room grid. Room detail puts members
beside contribution and weekly activity panels; profiles put the activity map and wall
beside recent sessions. Panels stack on phones, with horizontal overflow confined to
the yearly map. Chart colors follow theme tokens and avoid entrance animation.
English/Spanish copy belongs to `lib/i18n/community.ts`, excluding these surfaces from
DOM translation. `/profile` redirects authenticated users to their real public profile.

Room detail uses the shared PersonalNavigation header and personal-page-frame spacing,
matching Statistics and the own-profile page, including loading and error states.
Rooms is the active navigation item; there is no separate All rooms breadcrumb.

Room detail starts its activity column with `RoomDailyChallenge`: a trophy heading
labelled “Daily goal” in English, without a Daily badge or explanatory paragraph,
with the custom goal name directly below the heading and settings on the right.
There is no separate Target block; participant rows follow the header directly.
Participant rows align avatars and names to the left and worked minutes with the
target on one line in a right column, with a full-width meter below the row content.
The header wraps its actions on narrow phones. The card uses
participant focus meters in the existing growth color, completion
checkmarks and a team-completion meter. Ten participants appear initially; Show more
reveals the next ten. Names wrap on narrow screens. Shared CommunityDialog, community
form/button styles and the room's existing status toast own challenge editing and
feedback. English/Spanish copy lives in `communityCopy.challenge`.
The existing RoomChallenge table stores an owner-editable name and 5–480-minute goal.
Rooms without configuration have no challenge card or automatic goal. An owner-only
Set daily goal button in the room header opens the shared dialog with empty fields; saving
creates the challenge, and the same button can edit an existing goal. Progress is
derived from finished/stopped WORK and TIME_TRACKING sessions in that room using
sessionStats effective minutes and completion-date attribution. Current members and
the owner participate; departed members do not count toward team completion. A common
UTC day resets at midnight without deleting history. Editing the goal applies today
and on future days without resetting earned minutes. The card refreshes every 30
seconds while visible, on window focus, membership changes, saves and UTC rollover;
loading and retry states stay inside the card.

The goal editor uses CommunityDialog's `daily-goal` variant, sharing the Premium
purchase dialog's sage header, pixel title, close button, scrollable body and scenery
tokens at a compact 520px width. The explanatory paragraph is omitted. Daily targets
use one Daily target minute input with compact 25, 50, 100 and 150-minute
shortcut buttons directly underneath, without a separate preset heading. The buttons
have a visible pressed state. Presets only fill the draft; Save commits the goal.

The public profile shares the leaderboard's floating compact Navbar, including
loading/error states. Its content reserves 84px plus the top safe area, reduced to
80px at widths up to 800px. Shared Navbar styles own menu positioning and overlays.

`ActiveSessionTimer` owns the profile's current-session display. Time Tracking shows
elapsed minutes and seconds, matching the main timer, with its localized mode label
and no duration progress bar. Pomodoro sessions retain their remaining-time countdown.
The profile API includes active and paused public sessions; paused displays use saved
remaining seconds and stop ticking. Existing profile surfaces and typography remain canonical.

Leaderboard rows include a localized rank name and colored marker based on lifetime XP.
The table owns horizontal overflow on narrow screens. The profile rank badge links to
`/ranks`, with a localized tooltip and keyboard focus; no separate guide text is shown.

## Rank notifications

Rank upgrades use NotificationToast's shared `rank-up` variant, mounted globally by
RankUpToast. The paper card drops into the top-right corner beneath menu clearance,
with a rank-colored edge and shield-shaped trophy, pixel rank name and Inter details.
`app/globals.css` owns `.notification-corner` / `.rank-toast-*`, reusing pixel theme
tokens and `lib/ranks.ts` accent colors. It overlays without shifting or blocking the
workspace, fits phone safe areas, and respects reduced motion and forced colors.

## Upgrade to Pro

PaywallModal uses CommunityDialog's upgrade-pro variant: a 720px paper panel,
distinct sage header with a larger pixel title, a small muted productivity subtitle and borderless
close icon with a 44px target. There is no separate hero or crown seal. Inter owns feature labels,
plan details and prices. A fine divider separates the feature list from two native
radio plan cards; tomato marks selection and the shared checkout button. On phones
the columns stack, and the body scrolls beneath the always-visible close action.
`app/community.css` owns layout; `app/appearance.css` includes the dialog in the
shared scene-glass surface and token aliases on every route with rendered scenery.
Dark mode, forced colors and reduced motion follow existing theme roles.

The feature section has a prominent Inter heading, a compact pixel Pro badge and
an explicit included-in-both-plans caption. All benefits, including premium wallpapers
and unlimited habits, have equal visual emphasis with distinct outline icons,
ink-colored labels and fine separators. All feature styling inherits pixel/scene
tokens, and the list becomes a two-column grid on phones.

The native dialog temporarily closes while AuthModal or Paddle owns the foreground,
then returns with the selected plan preserved. Prices, trial terms and billing APIs
retain their existing owners. Checkout errors appear inline in English/Spanish.

## Timer settings

SettingsModal uses CommunityDialog's timer-settings variant: a 480px paper panel
with a sage heading, pixel title, two-column inset duration fields and square
state switches. Inter owns labels and help; pixel digits emphasize editable values.
The focus-duration card has a tomato top edge. Locked time tracking keeps its disabled switch visible with a compact Pro action
above it; the mode heading has no Beta badge. The footer stays visible while the settings body scrolls;
all colors and shadows derive from the existing pixel tokens in app/community.css.

## Central timer interaction

The timer stack is mode → digits → quiet segmented progress → current task → action →
light mode tabs. TaskPicker owns the shared authored, non-modal task disclosure,
including the mini timer. Its 340px paper trigger precedes a 116px terracotta action;
mobile keeps 16px inner margins. The popover anchors below, flipping above only when
space requires it, and owns its scroll without shifting the timer. Colors, 3px geometry,
Inter and pixel numerals retain the runtime owners above; no palette or font is added.

Search is transient local state. Enter creates and selects a new task (or selects an
exact existing match); arrows move through controls, Escape closes, and focus returns
to the trigger. Inline rename and completion keep the disclosure open; deletion needs
an explicit inline confirmation. Completed tasks remain in My Tasks but are omitted
from quick selection. Work and Time Tracking sessions retain the task lock, including while paused.
Short and Long Break keep the task picker visible and editable in both main and mini
timers; selection prepares the next focus session without changing the running break.
`taskService` owns task mutation requests for both TaskList and quick actions;
`useQuickTasks` updates the timer store and publishes successful changes to TaskList.
English/Spanish copy lives in `lib/i18n/taskPicker.ts`. Failures preserve input and
expose inline recovery, while pending mutations prevent duplicate submissions.


## Semantic timer modes

`data-timer-mode` follows the effective session type in the main and mini timers,
including idle previews, paused sessions and automatic transitions. `--timer-mode-color`
resolves to terracotta for Work/time tracking, natural sage for Short Break and muted
blue-gray for Long Break. The static label marker, active tab text, tinted background, underline and filled
progress segments use it. Active selection remains visible while running or paused;
Time Tracking hides the three-mode control, including before starting and while paused. Digits, buttons, panel surfaces and inactive segments retain
their existing neutral/brand treatments; the mode marker remains visible while paused.

`app/globals.css` owns the semantic role mapping: light mode reuses `--pixel-accent`
and `--pixel-growth`, with blue-gray #647d91. Dark/scenery variants use #e39a87,
#a7bc91 and #a0b5c6 for legibility. `app/appearance.css` selects those same dark roles
for photographic backgrounds. Forced colors uses Highlight and preserves mode labels
and tab selection semantics so meaning never depends on color alone.

## Focus Sounds

The home dock and its mobile tool menu open Focus Sounds in the shared non-modal
WorkspaceWindow. Eight compact icon keys form a four-column grid with small captions. Selected keys
appear pressed through a slight inset and recessed shadow. The footer contains only
one short, thin master-volume slider; individual sliders and Stop all are omitted. The dock
shows a small count of playing tracks. `app/ambient-sounds.css` reuses pixel roles,
Inter, existing window geometry and theme colors without introducing new tokens.
English/Spanish copy lives in `lib/i18n/ambientSounds.ts`.

## Project journal and public profiles

`app/(journal)` owns a natural-scrolling, 1040px reading/work column. This extends the
existing quiet paper-and-sage surfaces, Inter headings, 3px corners, fine borders,
and tomato primary actions. The signature is the Currently building project beside
honest completed-focus totals, followed by a restrained milestone timeline. It is not
a second social-network visual identity. The timer remains the main workspace.
`app/(journal)/journal.css` owns these compositions; all theme roles come from existing
`--pixel-*` tokens. The small timer project selector uses `app/journal-picker.css`.

Public profiles/projects/updates are server-rendered with canonical metadata and no
persistent page cache. Profile tabs and all lists use URL pagination, not infinite
scroll. Heatmap intensity uses completed minutes per UTC day, with keyboard/pointer
labels and its own horizontal scroll region. MilestoneCard is reusable and contains
project identity, optional real snapshot totals, and Pomo Cowork attribution.

The profile, project and post editors share fields, inline errors, image controls,
unsaved-change guard and explicit inline deletion confirmation. Native select and date
popups intentionally retain operating-system ownership for these simple low-density
forms; no custom popup geometry is required. Form language follows I18nProvider through
useJournalText; user-authored content and the public reading shell retain their own
text without DOM rewriting. Markdown is escaped React output with a narrow feature set.
NotificationToast remains the feedback owner; JournalToast only bridges navigation.

`docs/project-journal.md` records the user-authorized domain scope, server permissions,
privacy predicates, completed-session definition, deployment procedure, and manual
acceptance cases. Existing identity/session data is reused; the migration has not been
applied to a live database. Database validation/client generation and static lint are
allowed; the user's prohibition on builds, running the app, and tsc remains in force.

## Monthly Wrapped

Monthly Wrapped is a short private story, mounted by WrappedProvider and reopened from
the existing Wrapped entry points; both statistics routes omit Monthly Recaps. CommunityDialog owns native modal focus,
Escape and focus restoration; its monthly-wrapped variant owns the large story frame.
`app/wrapped.css` uses existing pixel surface, ink, sage, tomato, border and font tokens.
Inter carries short narrative headings and large metric numerals; the pixel face marks compact captions and the slide count. A month of daily bars and a seven-column streak grid
form the signature, showing actual activity rather than invented celebration metrics.
The opening slide uses oversized Inter focus time, a faint calendar-month numeral,
a small sprout seal, growth captions and the existing tomato action. Its surface,
text and accents follow the active site theme, including photographic scenery.
All slides use the same slim progress, month line, large Inter statistics, pixel
step counter and tomato next action. Short slides share a minimum story height;
long content may extend the frame. The visible dialog heading is omitted while
the close action stays available.
Mobile uses the full viewport and natural modal scrolling; desktop caps at 900px.
Arrow keys, touch swipes and labeled buttons navigate without automatic advancement.
Progress remains clickable; motion and counters respect reduced-motion preferences.

English/Spanish copy belongs to `lib/i18n/wrapped.ts`. Async failures retain explicit
retry/download/copy alternatives. The final 1080×1350 canvas uses the documented light
paper palette regardless of app theme, shares only aggregate metrics, and includes no
user identity, task names or project names. Native sharing requires a user click.
`docs/monthly-wrapped.md` defines completion attribution, snapshots, cohort eligibility,
deployment and manual verification. No runtime visual verification has been performed.

Monthly report invitations reuse NotificationToast in the top-right corner. An unread
message persists in NotificationsMenu until the report is opened; toast dismissal never
marks it read. The monthly-wrapped toast variant shares the existing paper card tokens.

## Profile achievements

Achievements extend the journal profile with compact Inter cards, existing paper/sage
surfaces and 3px corners. The default profile preview shows the three latest unlocked
achievements as compact icon/name buttons, without descriptions, status or dates.
An empty collection shows a short message, never locked preview substitutes.
Expanding opens all unlocked achievements newest first; the full catalog remains
available through an explicit status filter. Achievements are ordered automatically;
manual featuring is not supported. Rarity uses existing muted/growth/tomato/ink roles, explicit text labels,
and restrained single/double borders for legendary/mythic awards; no new palette.
`app/achievements.css` owns the composition and `AchievementBadge` owns icons.
`CommunityDialog`'s achievement variant owns details and focus restoration;
`NotificationToast` owns deferred, grouped unlock feedback and its profile link.
English/Spanish labels, names and conditions follow I18nProvider.
Unlocked cards keep paper surfaces, rarity-colored edges and a solid check/status label.
Locked cards use darker neutral surfaces, dashed borders, subdued monochrome badges
and an explicit lock/status label. Text stays opaque and readable; progress is neutral.
Both states remain interactive, including secret and public-profile cards without progress.
Status labels also appear in details and do not rely on color alone.


## Intent-specific SEO tools

### Study planners and templates

`weekly-study-planner`, `exam-revision-planner`, and `pomodoro-calculator` share
`PlannerLandingPage` and `StudyPlanner`. The English, translation-excluded tools
shell remains canonical for editorial content and controls. The signature is a
dated study ledger: a narrow date column joins the session checklist, while the
editable workload stays beside it on desktop and above it on narrow screens.
Inter owns headings, forms and data; the existing pixel face is reserved for small
captions and the local timer. No fonts, images, or global palette changes are added.

`StudyPlanner.module.css` maps its local paper/soft/ink/muted/line roles to the
existing `--pixel-*` runtime tokens. Primary actions reuse tomato and the established
light primary-button foreground (#fff3ed). Three-pixel corners, fine rules and
natural document scrolling match the other tools. Native date inputs intentionally
accept browser/OS popup geometry and locale; all date values are civil YYYY-MM-DD
strings. Form text, validation, and date captions stay English on these routes.

`lib/studyPlanner.ts` owns validation, templates, budget arithmetic and scheduling.
`lib/plannerStorage.ts` owns validated local snapshots and CSV escaping. The shared
`useLocalStudyTimer` remains the clock owner. Plans/drafts/checkmarks can persist
locally; active clocks reset on navigation and never change account sessions.
Seven selected days are visible at a time; printing reveals every generated day
and omits controls and site chrome. The journal's shared `UnsavedChangesGuard`
accepts an English copy/style variant for storage failures and active local timers.
`docs/study-planners.md` records limits, recovery and manual acceptance. Runtime
visual verification remains user-owned; no project, builds, tests or tsc are run.

### Independent aesthetic study desks

Five additional routes (`aesthetic-study-timer`, `cozy-study-timer`, `rain-timer`,
`animedoro-timer`, `study-stopwatch`) deliberately use page-local visual identities,
as requested, instead of the shared workspace timer. `LocalStudyTimer.module.css`
owns their semantic `--local-*` tokens and maps them to the editorial shell's pixel
roles locally. Pastel uses lavender paper (#fbf6fc), plum ink (#40364f), and sunset
peach (#edc0a4); cozy uses reading-paper (#f7f4e8) and green ink (#354539); rain uses
blue-night (#1b303d) and mist ink (#e6f1f4); anime uses lavender (#f5f2fc) and violet
ink (#39355b); the stopwatch uses notebook blue (#edf4f4) and teal ink (#26494e).
These are intentional fixed scenes in either site theme, not saved appearance settings.
Scenery contrast sampling and translucent editorial styling exclude their main element.
Forced colors restores system colors. Existing outer header/footer retain site styling.

Georgia carries the sunset, cozy and rain display; Trebuchet carries Animedoro;
Courier carries the stopwatch, with inherited Inter for labels and prose. No fonts
or image downloads are added. Original inline SVG/CSS scenes are decorative and
static: sunset hills, tea/books, a rain window, mountains, and a ruled notebook.
Sunset and Animedoro center the clock above a landscape; cozy/rain split the desk
note and instrument; the stopwatch uses a ruled journal. All stack on narrow screens.

`useLocalStudyTimer` is the per-mount timing owner for these five tools: timestamp
arithmetic with millisecond pause preservation, idle/running/paused/finished states,
and cleanup on unmount. `LocalStudyTimer` owns manual focus/break transitions,
duration validation (1–180 whole minutes), a local intention and completion count.
No store, socket, API, storage, document title, notification, or service-worker updates.
Each page resets on reload/navigation. The existing standalone practice timer stays
the owner for exam/classroom/reading; these new study desks require their own manual
break lifecycle and count-up Finish action. No shared session services are used.
RainAudio uses an isolated HTML audio element and the existing licensed rain asset;
it never touches the workspace mixer. Playback is opt-in, errors are inline, and
unmount stops audio. Countdown completion is visual and does not stop rain.

English tool controls follow the English translation-excluded landing page, without
depending on I18nProvider. Number/range inputs intentionally use native editing.
All actions have visible focus and disabled states; timer ticks are not live-announced.
Metadata, FAQs, related links, registry-driven discovery and sitemap reuse existing
SEO owners. `docs/seo-local-timers.md` records search evidence and manual checks.
Per the user's instructions, do not run the project, builds, tests or tsc for this task.

The English `(tools)` landing shell keeps server-rendered explanations, FAQs and
canonical metadata. Nine new routes extend the existing aesthetic timer, using
`seoRoutes.ts` as the sitemap/discovery registry and `seoIntentPages.ts` for authored
intent content. No new palette is introduced: `app/(tools)/tools.css` consumes the
existing pixel roles. Static sage landscape shapes distinguish aesthetic/lofi pages;
large split-flap clock digits are the only new animated signature and respect reduced motion.

`SeoWorkspace` owns the named presentation variants. Pomodoro variants reuse
`PomodoroTimer`, `TaskPicker`, `ProjectPicker`, and existing session services. Deep-work
and coding presets cannot replace an active/paused session. The minimalist view omits
appearance/PiP controls and the coworker feed, retaining a real online count.
`FocusSounds` and `useAmbientSounds` remain the ambient playback owners, with one mixer
per mounted SEO workspace, deliberate playback, and existing error/retry states.

`FocusStage` owns fullscreen and the expanded-page fallback; it keeps an exit button,
Escape support, scrolling, and keyboard containment in the fallback. Fullscreen is
entered by a click, never on page load. English/Spanish tool controls follow I18nProvider;
editorial copy retains the existing English, translation-excluded landing contract.
`StandaloneTimer` owns the local, unsaved exam and classroom countdowns and reading countdown/stopwatch.
These are intentionally separate from recorded focus sessions: timestamp-based elapsed
time, pause/resume/reset, locked duration/mode after starting, explicit visual completion,
and an honest reload-reset notice. The book field is local and never uploaded.
`FlipClock` displays device-local time and date, 12/24-hour format, and optional seconds.
Native number fields intentionally use browser-owned editing; no new modal or select
primitive is introduced. Browser verification remains user-owned for this task.

Five further intent pages use the same shell and theme: homework (20/5) and writing
sprints (15/5) use the minimal timer; timeboxing (30/5) uses the fullscreen presentation;
online body doubling (25/5) keeps live coworkers visible. `seoLearningPages.ts` and
`seoWorkflowPages.ts` own their English copy. Classroom uses the shared standalone
timer's named `classroom` variant: five minutes initially, 5/10/15/20-minute presets,
custom whole minutes, and a silent visual finish without automatic breaks. It does
not record sessions. The existing `exam` and `reading` variants retain their behavior.
`docs/seo-tools-expansion.md` records intent boundaries, research and manual checks.

The Navbar account avatar carries a shared red circular unread-notification count
in compact, desktop and mobile account views. `.avatar-unread-badge` in globals.css
uses white Inter numerals on #dc2626 with a paper border; its bottom-right placement
clears the Pro crown and does not resize navigation. Zero hides the badge.

## Focus projects and tasks

The workspace's My Projects window and `/projects` reuse `ProjectList`.
`/projects` uses its native table variant: Project, Created, Tasks and Focused time
columns, with quiet uppercase headers and fine row dividers. Creation dates follow
the active English/Spanish locale and browser timezone; unavailable dates show a dash.
Project-name buttons expand the shared task checklist in a full-width detail row.
On narrow screens the table scrolls horizontally within its own focusable region.
The workspace uses the compact list variant: a quiet project disclosure with localized task counts and tabular focused hours at the right
and todo checkboxes below. Task counts include completed child tasks and show zero for
empty projects, updating from the shared task store after mutations. Project headings
stay on one line: long titles truncate with an ellipsis and expose the full title on
hover; task counts use a small list icon and number with localized accessible text.
The disclosure grid vertically centers all content and reserves equal task-count and
focused-time columns across rows, centering each metric within its column.
Both surfaces support inline task creation and preserve drafts on failure.
Both surfaces support project creation; the workspace window has a neutral outlined
Manage projects navigation button in the window header beside Close, leading to that route.
It retains native link semantics and uses a transparent background, neutral border
and ink text, a medium-weight label, and a trailing chevron, with distinct hover, active, and
keyboard-focus states. The projects header has 6px inner padding; the compact 28px
button is vertically centered with extra separation from Close. Coarse pointers
retain a 44px minimum target height.
The list starts directly below the window header without a duplicate inner heading
or an empty divider row. Both the workspace and `/projects` add tasks inside each
expanded project's task list. The workspace's top input creates projects only:
a single outlined row with the shared ProjectColorPicker inside the name field,
a Create new project placeholder and arrow submit button,
without a project chip or type selector. It reuses existing pixel tokens and the
shared creation handler; success clears the title and expands the new project.
Only unfinished projects accept tasks; success clears that project's draft and
failure preserves it. The empty workspace shows “Create your first project and tasks.”
beneath the project creation field, localized and without a link.
Task entry is a single transparent row with
a fine bottom border and an integrated, quiet plus button; no separate empty-task
caption competes with its placeholder. Both surfaces use the existing pixel tokens,
Inter text and English/Spanish locale. Native
buttons own disclosures and timer selection; checkboxes own child-task completion.
Root projects have no completion checkbox or delete action on either surface.
Projects and child tasks show unfinished items first, ordered by the start date of
their latest recorded work/time-tracking session with positive focused time.
Project activity includes child-task sessions. Ties and items without sessions use
newest creation first; lifetime focused hours do not determine list order.
The My Projects workspace window uses circle selection buttons with a check in
the selected circle; labels say Select project/task. Selection never starts a
session. `/projects` hides selection buttons for both projects and child tasks.
The timer TaskPicker selects projects and tasks: no action menus, creation buttons,
inline editing or focused-hour captions. Search is temporarily hidden, with its
implementation retained. The empty state reads “No projects yet. Add a project in
My Projects.” with My Projects as an underlined inline link that closes the picker and
opens or raises the existing projects workspace window. Spanish uses localized copy.
TaskPicker
lists selectable projects with expandable child tasks. Project headings use
semibold titles; child tasks use regular titles and an
indented branch with connecting lines. Fine dividers separate project groups.
This hierarchy is retained in search results and the mini timer. The picker searches both titles and
shows project/task context for a selected todo. The existing native extension select
keeps platform-owned popup behavior and displays the same project/task context. A running or paused focus session
locks selection; its checklist can still be edited.

Existing `Task` rows are retained as root projects; child rows use `parentId`.
Sessions retain the legacy activity caption and journal `projectId`, with separate
`workProjectId`, `taskRecordId` and `projectName` for focus attribution. Root selection
has no taskRecordId. Project totals include work and time tracking, including time
from deleted child tasks; IDs preserve attribution across renames. Historical
same-title sessions resolve to the oldest matching project to avoid double counting.

Navbar navigation lists Timer, authenticated Projects, Rooms, Leaderboard, Statistics
and Habits. Projects follows Timer and uses Projects/Proyectos in both locales.
Rooms and Statistics have no release badges. Stats, Blog, Feed and Edit profile
are omitted from Navbar menus; profile and settings remain in the account section.

## Focus project colors

ProjectColorPicker owns the shared circular trigger inside the new-project and
rename-project inputs. Its anchored five-column menu offers nineteen named colors and no color,
with a visible check, keyboard navigation, Escape, outside dismissal and focus return.
The menu portals into the owning dialog when present to preserve modal interaction.
Its manual native popover uses the browser top layer so dialog blur and overflow do
not alter viewport positioning or clip the palette. Placement clamps to the visual
viewport and updates on scrolling, resizing and virtual-keyboard viewport changes.
`app/globals.css` owns light/dark `--project-color-*` tokens; `lib/projectColors.ts`
owns stable keys and English/Spanish labels. ProjectList and TaskPicker color only
project titles; child-task titles retain their normal text color. In the selected
project/task caption, only the project name carries its color. Tasks have no color control.
Existing projects retain default text until a color is chosen.

The project-color trigger stays transparent in idle, hover and pressed states; only
the circle carries a fill. Palette focus uses preventScroll, and ancestor scrolling
repositions the open palette instead of dismissing it inside Rename project.

The color palette uses 24px circles with 6px gaps and an inset centered checkmark,
plus a thin circular selection outline. No rectangular option tiles are shown.

The expanded palette has nineteen colors plus no color, arranged in four rows.
Every additional hue has light/dark text tokens and a stable API/database key.

Project name fields place the color circle before the text, on the left. The trigger
is centered against the input height, with reserved text padding in create and rename.

The project color palette joins the shared glass overlay selectors in
`app/appearance.css`: rendered scenery enables the same translucent surface, blur,
border and shadow as project actions and rename dialogs, including portalled menus.
Forced-colors mode retains the default accessible surface.

The homepage room switch sits outside the Active Sessions panel, 12px above its
upper-left edge. The rail reserves space above for it, including on mobile. Its compact outlined button includes
the localized Room/Sala prefix, the room name and a swap icon (lock while unavailable).
It uses Inter, existing pixel/scenery roles and 3px corners. Long names truncate with
full text in the accessible label and title. Other routes retain their original timer
control. Global/last-room switching and the running-session lock remain unchanged.


## Account access dialog

AuthModal reuses CommunityDialog's `auth` variant: a compact sage title bar with a
pixel Pomo Cowork caption, Inter heading, outlined Google action, email divider and
always-visible email form. Registration adds username and password confirmation in
the same column. Tomato owns the primary action and mode link; fields use existing
pixel surface, ink, muted and border roles. `app/community.css` owns layout and
`app/appearance.css` includes the dialog in the shared scene-glass selectors on all
routes with rendered scenery. Local aliases also cover fields, error contrast and
scrollbars in either app theme. The header stays visible while the body scrolls on
short screens; phone inputs use 16px text. Forced colors retains system surfaces.

## Premium grant dialog

The room's Invite friends and Room settings dialogs use CommunityDialog's
`room-invite` and `room-settings` variants, sharing the paywall title bar, pixel
heading, close control and scene-glass treatment. Both keep a compact 520px width
with a padded, scrollable body and matching mobile spacing. Invite friends keeps
inline search results; Room settings reuses the existing name and privacy fields
and save, cancel and delete actions.

CommunityDialog's `premium-grant` variant shares the `paywall-dialog` header,
pixel title typography, close control and scene-glass treatment with the Premium
purchase dialog. It keeps a compact 520px width and padded, scrollable message body.
Glass uses the existing scenery tokens in `app/appearance.css` when scenery is
rendered; plain backgrounds and forced colors retain the shared opaque surfaces.
