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
theme controls; guests can navigate and sign in. The leaderboard, statistics, user profiles,
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

## Personal timer appearance

The timer's icon-only Appearance button sits at the top beside Settings, with a localized
accessible name and tooltip. On narrow screens the status sits below the icon row.
It opens a native modal dialog with a compact scenery
gallery and five digit previews. The default remains Pocket Garden and pixel digits.
Three generated aesthetic landscapes and three Vercel Blob-hosted Mixkit videos provide
optional scenery; `public/backgrounds/README.md` records sources and generation prompts.
`lib/appearance.ts` owns the catalog; `app/appearance.css` owns its shared presentation.
Scenery appears on home, search timer pages and product routes: rooms, leaderboard,
both statistics pages, habits, profiles, ranks, settings and journal screens.
Existing room gradients remain inside room headers. Personal choice is shared per
browser, independent of the account.

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
it scrolls within a bounded dialog while the header and Done action remain reachable.
English/Spanish text follows I18nProvider via `lib/i18n/appearance.ts`.

`data-timer-font` maps pixel, system sans, Georgia, Courier New and Trebuchet MS to
`--timer-face` in `app/appearance.css`, with local fallbacks. Only timer numerals change,
including the native mini window; existing size/line-height remains stable. UI and
body typography retain their previous owners. No extra font request is introduced.
Video is muted and loops, with playback controls in appearance settings only. Reduced-motion users get
the poster without a video request; hidden tabs pause playback. Forced colors hides
scenery and retains system surfaces. No new palette or global theme change is needed.

## Profiles and rooms

`/user/[id]`, `/rooms` and `/rooms/[id]` share the garden background, compact Navbar,
cream/sage surfaces and existing pixel tokens. `app/community.css` owns their scoped
composition: restrained pixel headings, readable Inter content, square avatars,
compact metric strips and offset panel shadows. Room-owned gradients remain available
inside the room header. Personal timer scenery retains its existing scope.

The directory separates the global desk from the room grid. Room detail puts members
beside contribution and weekly activity panels; profiles put the activity map and wall
beside recent sessions. Panels stack on phones, with horizontal overflow confined to
the yearly map. Chart colors follow theme tokens and avoid entrance animation.
English/Spanish copy belongs to `lib/i18n/community.ts`, excluding these surfaces from
DOM translation. `/profile` redirects authenticated users to their real public profile.

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
`StandaloneTimer` owns the local, unsaved exam countdown and reading countdown/stopwatch.
These are intentionally separate from recorded focus sessions: timestamp-based elapsed
time, pause/resume/reset, locked duration/mode after starting, explicit visual completion,
and an honest reload-reset notice. The book field is local and never uploaded.
`FlipClock` displays device-local time and date, 12/24-hour format, and optional seconds.
Native number fields intentionally use browser-owned editing; no new modal or select
primitive is introduced. Browser verification remains user-owned for this task.

The Navbar account avatar carries a shared red circular unread-notification count
in compact, desktop and mobile account views. `.avatar-unread-badge` in globals.css
uses white Inter numerals on #dc2626 with a paper border; its bottom-right placement
clears the Pro crown and does not resize navigation. Zero hides the badge.
