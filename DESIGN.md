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

## First focus

The left workspace dock shows a quiet 9px uppercase `TOOLS` heading, 22px icons and
10px medium-weight single-line localized labels. Compact mode uses 20px icons and
the same 10px labels. Labels use 75% muted theme color mixed with black, or 45% scenery ink mixed with black on
backgrounds, keeping icons visually primary. The slim shell uses a 1px border, 6px corners and a 2px pixel shadow;
buttons measure 58 by 50px (56 by 48px in compact mode).
Short tool names come from gardenCopy.toolLabels; the current rank
remains in the accessible name. Buttons use even spacing with thin inset separators.
Dock tooltips are removed. `HomeWorkspace` owns the labels;
`app/globals.css` and `app/workspace-compact.css` own the stacked button geometry.
The mobile tool menu retains its existing row layout.

Small laptop workspaces (960–1535 CSS px wide, or desktop windows at most 820px
high) use app/workspace-compact.css when the primary pointer is fine. It reduces
timer digits, gaps, dock icons, navigation controls and default window width
(304px), while preserving readable copy, actual drag geometry and explicit user
window resizing. Sound keys remain 44px; touch and mobile layouts retain their
existing sizes. The ordinary timer panel is capped at 560px wide in compact mode,
centered within its existing grid column; Daily Flow keeps its planning width.
The presence onboarding sits outside the bottom-left edge of the
people panel, clear of the people list. These overrides reuse existing theme tokens and
load after the base component styles; no page zoom or transform scaling is used.

The homepage presence rail has a dismissible onboarding callout explaining that
people with active timers appear here and starting a timer joins them. HomeWorkspace
owns the callout independently of the session list: empty and collapsed lists also
show it, but only for guests (including anonymous accounts) who have never started
a timer. Registered accounts never see it. The timer store records starts and restored
sessions in browser storage and immediately hides the callout on the first start;
legacy first-focus and guest-completion markers also suppress it.
It is anchored outside the rail at its bottom-left edge, with a pointer
back to the people panel. On mobile it follows the list in normal flow, aligned left.
It uses Inter and existing paper/ink/tomato tokens, has no backdrop
or automatic focus, and closes with its labeled button or Escape while focused.
Dismissal returns focus to the rail toggle when needed and persists in browser
storage; unavailable storage retains dismissal for the visit. English/Spanish copy
belongs to gardenCopy. The ordinary empty state remains intact underneath.

The ordinary homepage timer offers new visitors one short invitation, 10/25/50-minute
session presets, a Custom button opening the existing timer settings, and a
duration-specific primary action. `firstFocus` is a homepage-only
PomodoroTimer variant; Daily Flow and SEO tools retain their own entry experience.
The empty task picker is hidden during this invitation; existing tasks remain selectable.
Existing account history, XP, active sessions and saved browser timer settings suppress
the invitation. A successfully created session records completion per
account (or guest) in browser storage. Storage failure leaves the ordinary timer usable.
Presets change the current preview, without saving over account duration preferences.
Shared TimerControls owns the optional start label, I18nProvider owns English/Spanish,
and app/globals.css maps the compact controls to existing pixel theme tokens.
There is no modal, automatic start or forced registration. Returning users keep the
ordinary timer. The invitation has no close button.
On a first browser visit without saved window preferences, Focus Sounds opens at
viewport widths of at least 1280px. It stays beside the left dock without the usual
window stagger, does not move keyboard focus and never starts audio automatically.
Saved window preferences (including an empty workspace) always take precedence;
closing the window persists through the existing workspace storage. Narrower screens
keep the existing empty initial workspace.

## Illustrated product updates

`ProductUpdateProvider` opens an app-owned `CommunityDialog` only after a user
clicks an update notification, its toast action or an admin preview.
`ProductUpdateToast` reuses `NotificationToast` with the `product-update` variant
and the existing recap action button styling. It shows localized release copy
for 12 seconds, pauses on hover/focus/hidden tabs, waits for dialogs and other
corner toasts, and deduplicates per account/notification in browser storage.
Closing it leaves the inbox entry unread; account changes hide the toast.
The first release describes
Pomo blogs first, followed by themes and timer fonts, with localized English/Spanish
copy in `lib/productUpdates.ts`. Blogs have localized browser screenshots of the actual project directory
and built-in demo project, using mock data without real user content. The feedback
widget is hidden during capture. Images retain native aspect ratios, captions and links to the directory and existing public-project
creation form. Navigation closes the dialog; modified clicks retain it. The two
appearance SVG illustrations retain their existing layout. Blog images are real
screenshots; appearance images are illustrations. The update dialog reuses the paywall shell and its compact pixel heading, muted
header surface and unframed close control. The title is the localized What’s new
label. The blogs section starts with a Pomo blogs SVG wordmark matching the blog
header typography and paper/ink/tomato palette. Each section starts with a clear
22px Inter feature heading above its imagery (Pomo blogs, Site themes, Timer fonts).
The descriptive subheadings use 17px Inter,
quiet bullet points and 2px image corners. Sections retain thin 1px separators
with 24px margins and padding.
`app/product-updates.css` owns the 720px dialog, fixed header/footer,
scrolling body, responsive gutters and content typography; the shared theme owns
colors and material. Images reserve their ratio and have localized alternative text.
Inter owns readable text; no autoplay, animation, carousel or forced opening is added.
The admin Product updates section uses existing cards/buttons and confirmation
behavior. Preview is independent of delivery; sending is an explicit administrator
action. See `docs/product-updates.md` for rollout and future-release authoring.

Update activity in the same admin section reuses the admin table frame, horizontal
overflow, pagination, loading/error/empty states and `useAdminData`. Each row shows
the user's avatar (initial fallback), display name/username, release, action and
Kyiv timestamp with seconds. Existing admin CSS tokens own its presentation.

## Admin latest user activity

Overview and All metrics reuse `AdminRecentUsers` for a registered-user count and
20-row list ordered by last seen. The 7/30-day buttons and pagination reuse admin
table styles, English copy, Kyiv timestamps, and `useAdminData` loading/error/retry
states. `activityDays` and `activityPage` persist in the URL without changing the
active section. Existing admin CSS tokens remain the visual owner.

## Public project detail header

The project detail page omits the back-to-profile link and standalone cover banner.
An optional cover image sits behind the name/description identity block, with an
88% paper-token overlay for text contrast; no cover means no image or placeholder.
The identity stays content-sized. Forced colors hides the decorative cover.
`PublicProjectView.tsx` and `app/(journal)/journal.css` own this presentation.

## Public project directory

Update cards separate author/type, linked project, written content, focus snapshot
and publication date. Icons label the post type, project, metrics, tracked period
and social actions. Focus metrics share a compact two-column inset panel; tracked
period and publication date have explicit localized labels. Shared UpdateCard owns
this hierarchy across feed, profiles and post detail, using existing glass tokens.
Post reactions display only an icon and count, without borders or button backgrounds;
localized accessible labels and tooltips identify actions, and a filled heart marks
the liked state. Keyboard focus and comfortable hit areas remain available.
Likes update the heart and count optimistically, reconcile with the server response,
and roll back with inline error feedback on failure. A separate mutation lock prevents
duplicate requests without blocking comments. Liking triggers a brief heart pop;
reduced-motion disables the animation, and pending likes retain their full opacity.

The update composer reuses the public project editor's journal-card glass shell,
heading emblem, control tokens, two-column content/publishing layout and footer.
Text, preview and image attachments occupy the main column; focus stats and
visibility occupy the inset settings panel. Mobile stacks the columns. Inner
panels use token-derived tints without adding another backdrop blur.
Composer attachments use the shared ImageAttachments gallery variant: image tiles,
an upload tile with a count, local upload preview and individual remove controls.
The gallery preserves the four-image limit and project image-picker styling.
Composer route/authentication and existing-post loading share a form-shaped skeleton
with the editor's glass shell, header, content/settings columns, image area and footer.
Its responsive layout matches the form and pulse honors reduced motion. New forms
render without waiting for project options or focus statistics, which retain their
own loading states.

`/projects/public` is a guest-accessible catalog of public project pages. The supplied
reference is superseded by the requested compact redesign: a 44px logo beside the
name and status, an optional right-hand description, slim task progress, three equal
centered metric columns in one inset surface, and a separate weekly-activity strip.
The author and start date form one footer identity; followers align opposite it.
The project title link stretches across the card, with a card-wide keyboard focus
outline. The author link and follow controls remain independently interactive above it.
Descriptions sit beside the identity behind a fine vertical divider, with up to
three lines and a native title tooltip. Below 340px of card content width they move
below the identity with up to two lines. Empty descriptions render no block.
The header has a compact 76px minimum height. Cards share equal
grid-row heights, use 10px section gaps, and anchor their footers at the bottom.
The streak counter is omitted; the seven weekly bars fill the remaining width after the label. Paper/sage/tomato runtime tokens
preserve the product identity; catalog cards use a 16px radius and collapse to two
then one column. Inter owns dense text; tabular numerals align statistics.
`app/(journal)/projects/public/public-projects.css` owns this route's geometry.
Catalog loading uses PublicProjectsLoading for both Suspense and query loading:
twelve placeholders reuse the real responsive card grid, header, progress, metrics,
weekly activity and author footer geometry, with reduced-motion support.
Catalog empty, loading and error states reuse `journal-card`, including the shared
scenery glass surface, blur and forced-colors fallback. State panels use the same
16px radius as catalog cards, a solid border and responsive inner spacing.
The journal query, error/loading primitives, Radix JournalSelect and FollowButton
remain canonical. The bookmark is a project-follow variant, with the same auth and
mutation behavior as the public page. The toolbar, result count, search, status filter and sort controls are removed.
Paging remains URL-owned; projects use newest-first order. The directory uses 12-item server pages,
explicit previous/next actions, existing UTC project statistics and public author
fields. Only PUBLIC projects belonging to non-anonymous users appear. No invented
tags, verification or sprint data is displayed. English/Spanish follow I18nProvider.

The blog section now owns `BlogHeader`, an in-flow Pomo blogs wordmark, Projects /
Feed navigation, timer link, shared theme switch, publish action and
account/sign-in control. `lib/journal/routes.ts` defines the section: nested project
routes, public @profiles/posts, feed, discover, journal and journal profile settings.
The personal `/projects` workspace retains its compact menu. Blog routes omit the
floating workspace menu, support widget and standalone Back to timer link. The
catalog's introductory hero is removed; it begins directly with project cards and keeps
a visually hidden h1. `app/(journal)/blog-header.css` owns header layout, including
its two-row mobile navigation and theme/scenery adaptations. AuthModal, ThemeToggle
and the existing profile/project routes remain canonical; scenery preferences stay
in effect. The header scrolls with the document and introduces no overlay menu. It uses a
64px desktop row, a text-only wordmark, plain navigation with a thin active underline,
an icon-only theme control and a quiet outline publish action. Search and sorting
and the count/status toolbar are absent. The blogs word uses --pixel-tomato-ink.

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

Daily Flow replaces the ordinary timer in the homepage's central focus station.
Timer settings owns a Open Daily Flow button, with a Beta label beside the mode name
and panel wordmark. `useWorkspaceModeStore` remembers the browser's selected mode;
the panel's Pomodoro button returns to the ordinary timer. `/daily-flow` redirects
to the homepage with the mode selected. Workspace tools and coworkers remain available.
A bordered glass shell groups planning,
focus, summary and history, reusing the shared product scenery blur and surface tokens.
On the homepage with scenery, the focus station owns the single glass surface;
Daily Flow's inner shell is transparent and shares the workspace-window scene token
adapter for text, fields, dividers and progress. No opaque paper layer or second blur
is painted over that glass. Default backgrounds retain the paper treatment.
Default themes use a lightly translucent paper surface, with an opaque fallback; forced
colors restores system surfaces. It keeps the unboxed timer,
Inter task names, pixel headings, paper/sage surfaces and existing tomato primary
buttons. The only new visual emphasis is a sage Complete Task action. Task entry uses the project task list; project headings only expand their tasks.
Each expanded project offers a single-line input and Add task button to create a
real project task, which the user then selects for the day. The planning queue uses numbered rows with visible move/edit/remove buttons, including on touch.
Focus shows one task, a slim completion meter and the shared PomodoroTimer; other
queue titles stay hidden. The existing native mini timer replaces its picker with
that single task caption. Session controls, settings, sound and auto-start are shared.
History can open without unmounting the timer. The completion screen gives the day
room to end, with a small check/sparkle animation, task/focus totals and Finish My Day.
All animations honor reduced motion. New colors derive from runtime pixel tokens;
`app/daily-flow/daily-flow.css` owns page geometry, `app/community.css` owns the settings
entry, and global styles own the mini-timer caption. Dense content continues to use Inter.
Daily Flow copy and accessible labels follow English/Spanish in `lib/i18n/dailyFlow.ts`.
Its browser-only, account-scoped persistence is independent of project/task records;
planning and quick add reuse TaskPicker to select only tasks inside unfinished
projects, with a muted project caption and disabled entries already included today.
Projects cannot be selected. Inline creation uses useQuickTasks/taskService and saves
to the parent project; creating and selecting for the day are separate actions.
Normal timer task selection is preserved. See `docs/daily-flow.md` for lifecycle and
manual verification. No server schema, subscription or project setup is required.

Daily goal has its own Target button in the homepage dock and mobile tools menu.
It reuses WorkspaceWindow for saved geometry, keyboard controls and focus return.
The compact Inter counter sits above a twenty-segment meter in the existing tomato
tokens; reaching the target switches the meter to growth green and shows a check
and explicit completion text. The display includes actual/target values, percentage,
remaining work and today's completed Pomodoros/focus minutes. No circular meter or
new palette is introduced. `app/daily-goal.css` owns its styles and inherits the
workspace scene-glass token mapping, dark theme and global scrollbar behavior.
The inline editor offers Pomodoros or hours, four presets, explicit Save/Cancel and
Remove; validation and storage failures retain the draft. English/Spanish copy lives
in `lib/i18n/dailyGoal.ts`. The former embedded goal in Your progress moves here;
rank, streak and community totals stay in their existing window.
The Today row appears only with a saved goal. Counting and browser-storage footnotes
are omitted from the window to keep the surface compact.

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
Project create/edit reuse the Projects personal-page frame and responsive gutters;
the editor card is centered with a 960px cap. ProjectEditor uses a compact Inter
heading, a main details column and a narrower publishing panel with a subtle tinted surface; below 760px these stack. About and logo/cover use native details
disclosures, with field errors opening the relevant section. Settings and save/cancel
stay visible. QueryError keeps its retry behavior in a compact inline treatment.
Fields, uploads, feedback and unsaved guards reuse journal primitives; native select
and date popups remain platform-owned. Colors inherit the existing pixel and scenery
tokens. Optional sections preserve values while collapsed.
The editor is a deliberate softer form variant: 14px outer corners, 8px field corners,
low-contrast token-derived field fills, regular-weight values, inset aligned chevrons
and checkbox-backed switches. Native select popups remain OS-owned; only their closed
triggers are styled. Disclosure chevrons align at the trailing edge. Error retry is
a quiet underlined action in a compact tinted notice.
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
keeps its original 640px base height (clamped to the available workspace), growing
only when its contents need more room, up to the available workspace height, with a subtle left divider,
plain heading and online count. The list alone owns overflow, with the same thin,
rounded scrollbar and transparent track as task popovers; the heading stays visible.
From 960px the rail sits beside the timer; narrower screens
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
Its buttons have localized accessible names and short permanent labels below
the icons, with a `TOOLS` heading above the group and thin inset separators. The progress
accessible name includes the current experience rank. Above 719px the homepage has no document scrolling; mobile uses document scrolling through the timer and full session list. Only the first-focus variant adds a one-line invitation. The timer
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

`LeaderboardStandings` owns the shared podium, avatar fallback, Pro badge and ranking
table for the global board and room detail. `RoomLeaderboard` occupies a dedicated
full-width room tab at the global board’s normal scale: three leading coworkers, ranks, exact focus minutes in
h:mm, Pomodoro counts, relative time bars and the current-user highlight. Room data
retains the room-only top-ten scope; places sort by exact minutes before
display rounding. `LeaderboardDateFilter` owns the shared day/week/month/year buttons,
period navigation and inline DayPicker for both boards. Both default to the current
month; `lib/leaderboardPeriod.ts` owns server calendar boundaries and labels. Room
filters persist in roomPeriod/roomOffset/roomStartDate/roomEndDate URL parameters.
The room overview totals retain their lifetime scope. The Overview and Leaderboard navigation links preserve the selected view in the
`tab` query parameter. Overview keeps members, daily goal and weekly activity; the
room header and totals stay visible in both views. Shared responsive geometry lives
in `app/leaderboard/leaderboard.css` and confines table overflow to its own wrapper. Existing room access checks and
loading/empty/unavailable states remain the owners of data visibility.

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

`/pomodoro-effect` uses the minimal-guide variant: a short centered heading,
an unboxed centered minimal PomodoroTimer, two explanatory paragraphs, three
FAQ disclosures and three related links. Promotional sections, live presence,
registration invitation and repeated CTAs are omitted. The existing timer,
metadata and FAQ schema remain canonical; tools.css owns scoped geometry.
This route uses a flat theme background without scenery, grid, gradients or timer
card material. Task/room pickers and the Ko-fi support widget are omitted.

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
The study-with-me and study-timer-with-friends routes use compact workspace copy: a short intro and interval note,
one live-presence heading, and a single rooms link. Repeated eyebrows, explanatory
presence copy and the visible timer heading are omitted; the timer retains its
accessible heading. Timer-jump CTAs and the settings link are omitted on these routes.
A compact invitation below the timer opens the shared AuthModal in registration mode;
signed-in visitors get an Open workspace link instead. Guests can also explore the
workspace directly. Editorial sections below the workspace remain intact.
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

The selected material now applies site-wide. `app/site-appearance.css` owns the
root palette adapter, semantic card surfaces, neutral utility compatibility and
admin palette bridge. White, Dark red, Ivory, Paper, Terminal and Neon set page, text, form and scrollbar
roles globally; all twelve materials style content cards on product, journal, blog,
tool and admin pages. Surface transparency never makes inverse text or native
control colors transparent. Existing layouts, table scrolling, semantic action
colors and imagery remain component-owned. Admin no longer opts out of the selected
material. Scenery keeps its existing route scope; changing a material does not load
background media on additional routes. Ko-fi retains its provider-owned surface.
The settings label is Site theme / Tema del sitio, with the existing storage key,
cross-tab synchronization and Glass reset default.

Site theme is the last group in Appearance, after backgrounds and timer fonts, with native radio cards and miniature
window previews. Glass preserves the existing scenery blur and paper fallback. Matte
uses opaque surfaces, 14px corners and a soft shadow; Pixel uses opaque surfaces, 2px
corners, a hard offset shadow and pixel window captions. Dense content keeps Inter.
Clear glass reduces the scenic panel fill from 68% to 18% and blur from 18px to 6px;
plain backgrounds use an 18% paper tint. No background removes window fills, header
fills, blur and shadows while retaining borders, controls and interaction states.
Outline uses opaque surfaces, 6px corners, fine borders and no shadow. The transparent
variants clear embedded workspace panel fills as well as their outer shells; scenic
text receives a dark shadow to improve legibility. Previews illustrate each material.
Paper adds a warm #f6efdc surface with a fine CSS texture and layered edges;
Terminal uses #101c17 panels, green details and monospace window headings; Neon
uses #18172d panels with a static violet glow and 16px corners. Each material owns
a complete local foreground, muted, border and control palette, independent of
scenery and the page theme. Dense content and semantic action colors stay shared.
Their previews reuse the material tokens; no new assets or animation are required.
The twelve choices use three columns on desktop and two on narrow screens.
Glass, Matte and Pixel appear first and are free; all remaining nine styles require active Pro access.
Locked cards show the shared Pro badge and open the existing paywall. Style changes
apply immediately, independently of scenery, timer font and light/dark theme.
The store checks access when choosing, restoring and syncing preferences. Without
Pro, a saved premium choice falls back to Glass but is retained for reactivation.
Before auth is verified, the early page bootstrap applies only free themes. The browser preference and cross-tab updates belong to
`useAppearanceStore`; missing or invalid saved styles fall back to Glass, and Reset
appearance restores it. The settings dialog itself previews the current material.

`app/window-design.css` owns `--window-radius`, `--window-shadow`, `--window-backdrop`
and opaque `--window-scene-*` adapters. `app/appearance.css` consumes those adapters
at its existing local scene-token owners, including portalled dialogs. Scenery retains
its dark readable palette in both themes; opaque panel/task/popover colors are
#141c19, #0c1210 and #141917. Default backgrounds retain the light/dark pixel palette.
Workspace windows, shared dialogs, menus and scenery shells share the chosen material.
Rounded headers and scrolling bodies keep resize handles outside the window accessible.
Daily Flow keeps one outer surface; Ko-fi retains its provider-owned presentation and
the mobile recap remains full screen. Forced colors keeps system surfaces and outlines.

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

Timer digits use per-face optical scaling in `app/appearance.css`: Pixel 1×,
sans/Space 1.4×, serif/mono 1.5×, rounded 1.45×, Orbitron 1.18×, Cormorant 1.7×,
Bebas 1.55× and VT323 1.65×. `.timer-numerals` scales only the face inside the
existing line box, keeping surrounding controls stable. A container-width cap
uses the actual formatted character count and a conservative per-face glyph width
to fit long values and narrow windows. Main timer, native mini timer and font
previews share this rule. VT323 alone uses a 1.2× horizontal optical correction
to soften its condensed proportions without increasing height. Its .72em glyph
width budget accounts for the expansion and the Courier fallback on narrow screens.

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

Room headers and participant panels show the unique count of room members online
on the site. A green/gray online dot sits beside each username with an accessible
label and tooltip. Participants appear in compact bordered rows; an active worker's
entire row receives a pale green surface and green border derived from growth/paper
tokens. A readable right-aligned timer counts down focus/break time, counts up time
tracking, and freezes on pause. Activity labels show working, idle, pause or break;
role captions are omitted. Timer digits use tabular Inter and a reserved clock column.
Rows wrap on narrow screens, and timer updates stay inside each row rather than
rerendering the room charts. Participants sort into online with a visible timer in this room,
other online, then offline, preserving original order within each group. Paused
and break timers remain in the timer group. Timer expiration, presence and session
updates automatically refresh the order.
`RoomPresence`/`RoomParticipant` reuse `useConnectionStore` and `useTimerStore` socket snapshots;
The viewed room ID scopes green working cards and visible timers. Active sessions
in another room (including the global workspace) show Working in another room with a green status dot,
or the corresponding outside-room pause/break label, without a timer or green card.
These users sort with other online participants. Outside-room sessions use only an
expiry timeout, not a ticking interval. Working means an unpaused, unexpired WORK
or TIME_TRACKING session.
Expired sessions stop displaying as working even without another socket event.
Disconnects show Status unavailable instead of marking everyone offline. Existing
pixel growth/tomato-ink/muted tokens own the colors; indicators wrap on mobile and
English/Spanish labels live in `communityCopy`. No extra connections or API polling.


Room detail places `RoomDailyChallenge` immediately after the room header, before
statistics and tabs, visible in both Overview and Leaderboard. Its full-width panel
uses a growth-colored top edge and trophy emblem. The left summary pairs the large
custom goal name with the daily minutes target and team-completion meter; participant
cards occupy the right side, separated by a fine rule. The current user's row comes
first with a growth-tinted background and border; other rows retain server order.
The roster scrolls at 290px so large rooms do not push other tools far down the page.
Below 720px the summary and roster stack. Existing pixel tokens, Inter, native progress
meters and completion checkmarks own the visual language in all themes.
Ten participants appear initially; Show more reveals the next ten. Names wrap on
narrow screens. Shared CommunityDialog, community form/button styles and the room's
existing status toast own editing and feedback. English/Spanish copy lives in
`communityCopy.challenge`. `app/community.css` owns the layout and component styles.
The existing RoomChallenge table stores an owner-editable name and a whole-minute
goal of at least 5 minutes. The editor uses separate hours and minutes (0–59)
fields and 1/4/8/12-hour presets. Existing targets split into hours and minutes on
open; cards format both worked time and targets in those units. There is no 8-hour
product cap; shared validation only enforces the underlying Prisma Int boundary.
Storage remains in minutes and requires no migration.
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
and no duration progress bar. The main Time Tracker also omits the progress bar,
uses 8px bottom padding below the digits and a 12px gap before the controls.
Pomodoro sessions retain their remaining-time countdown.
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

Menu buttons also show a prominent red 22px count badge (capped at 99+) while unread notifications exist; opening
the menu alone does not clear it. Their accessible names include the unread count.
Unread counts belong to NotificationsMenu's envelope trigger and panel header in
compact, desktop and mobile navigation. Zero hides the count. Account avatars retain
profile/account actions and preview behavior regardless of unread notifications;
they never display notification badges or open the notification panel.

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

The room's Invite to room and Room settings dialogs use CommunityDialog's
`room-invite` and `room-settings` variants, sharing the paywall title bar, pixel
heading, close control and scene-glass treatment. Both keep a compact 520px width
with a padded, scrollable body and matching mobile spacing. Invite to room appears
in the room header for owners and participants. It offers a selectable invitation
link with Copy link, followed by the existing debounced username search and inline
results. Search supports Tab, arrow keys and Escape; current participants are excluded.
Link loading, retry, clipboard fallback and sent feedback reuse community primitives
and English/Spanish copy. Room settings reuses the existing name and privacy fields
and save, cancel and delete actions.

The member invitation API admits owners and participants. Signed share links use a
separate key from login tokens, last seven days, and require their creator to still
belong to the room. The join API checks them before admitting a non-member to a
private room. Visitors sign in through AuthModal with the link retained; successful
joining removes the token from the URL. No schema changes or new tokens are needed.

CommunityDialog's `premium-grant` variant shares the `paywall-dialog` header,
pixel title typography, close control and scene-glass treatment with the Premium
purchase dialog. It keeps a compact 520px width and padded, scrollable message body.
Glass uses the existing scenery tokens in `app/appearance.css` when scenery is
rendered; plain backgrounds and forced colors retain the shared opaque surfaces.


## Administration dashboard

All users adds a Manage column in Unregistered with a Delete action per anonymous
account. `AdminDeleteDialog` shares visitor deletion's CommunityDialog confirmation,
admin button tokens, pending lock, timeout and inline retry errors. The confirmation
names the account and permanent removal of related data, including owned rooms.
Success announces deletion, clamps pagination, refreshes and focuses Refresh.
Registered accounts have no deletion action and are protected by the server mutation.


User counts (`/admin#user-counts`) reuses the admin toolbar, metric cards and
scoped tokens for registered, anonymous and combined account totals. The current
Kyiv month is the initial period; previous/next arrow buttons flank the labelled
native month input, including year transitions. The input accepts the platform-owned
calendar popup, locale and keyboard behavior. The `usersMonth` URL parameter
preserves the selected creation month. Four cards, including registration conversion,
form one desktop row, two columns below 1200px and stack below 800px.
Conversion uses registered / total accounts, formatted as a percentage with one
decimal place; zero total is unavailable. Loading/unavailable values use a dash; errors offer Refresh
and zero counts have an explicit empty-period message. No new tokens are added.

Overview and All metrics show unique online timer users across all rooms, including
paused timers and guests, from the existing live session store. Monthly new users
includes registered and anonymous accounts created in the current Kyiv month.
Monthly registered remains a separate card counting only registered accounts.
New visitors adds a labelled native Referrer select using existing admin tokens;
the OS owns its popup geometry and keyboard behavior. Options come from saved
referrers across the entire current visitor list, with All and Direct / unknown.
The filter and page persist in the URL; changing the filter resets pagination.

New visitors (`/admin#visitors`) reuses AdminDataTable, CountryFlag and the existing
admin tokens. Rows show IP, country, first landing pathname and
Kyiv timestamp, newest first, with 50-row pagination and the shared loading, empty,
retry and error states. Registered and persisted anonymous profiles are excluded;
conversion removes the initial visit. Unknown IP or country is shown as a dash.
The November 3 expansion adds Browser / OS, Device and Referrer columns plus native
Visitor details disclosure, sharing the existing Beep disclosure tokens and semantic
definition lists. Its keyboard focus matches admin controls. Capability data is
labelled as reported/estimated; historical rows without it say Not recorded. The
entry snapshot includes locale, timezone, screen/viewport, pixel density, touch,
reported CPU/memory, connection class, preferences and privacy signals when available.
Each visitor row has a Delete action, following Paywall activity's CommunityDialog
confirmation and danger styling. Success refreshes the clamped page, announces Visit
deleted and focuses Refresh; errors remain in the dialog for retry.

`/admin` is an intentional visual exception requested by the user: a conventional,
white dashboard, independent of the public pixel identity and the saved dark theme.
`app/admin/admin.css` owns scoped `--admin-*` tokens: white surface (#ffffff), cool
canvas (#f5f7fa), fine border (#e4e8ee), ink (#172033), secondary (#475569), muted
(#64748b), blue action (#2563eb), hover (#1d4ed8), pale blue (#eff6ff), and blue
border (#bfdbfe). Admin components consume these tokens directly; local pixel aliases
adapt the existing CommunityDialog and scrollbar primitives without changing public
tokens. Typography inherits Inter; headings use restrained semibold, data uses
tabular numerals. Cards have 12px corners, controls 8px, and subtle soft shadows.

A 240px white sidebar groups Overview, Referral links, Pro users, Support inbox,
and Paywall activity. Below 800px it becomes horizontally scrollable navigation;
content retains natural document scrolling and event tables scroll horizontally.
Overview uses real API counts, with a dash until each dataset loads. The existing
English admin register is retained; activity retains its English/Spanish support.
Public donation and feedback widgets are suppressed while this shell is present.

Admin overview adds today/month-to-date registered-account creation counts, today's
session starts (all timer types), total paywall actions, habit totals with active and
archived counts, and wall-message totals. Calendar boundaries use Europe/Kyiv.
New All users, Online users, Wall messages, and Habits sections reuse the same white
admin tokens and horizontally scrollable tables with 50-row pagination. All users
includes registered/guest filters and the directory's focus metrics. Habit rows show
owner, title, status, start date, completion count and creation time. Wall messages
retain full text and link both author and profile owner. Live presence comes from the
existing socket store; disconnection is explicit, never presented as zero users.

The overview leads with four highlighted metrics: Currently online, New users, New
anonymous users, and Paywall activity. They use the existing pale-blue surface, blue
top border, outline icons, and larger numerals. New accounts use today in Kyiv;
paywall retains its all-time recorded-event count. Live online includes accounts
and anonymous connections and shows a dash while disconnected. Other metrics remain
below in neutral white cards.

Below the primary overview metrics, a compact white Online users panel lists live
account names with initial avatars, green presence dots, and profile links. Its
220px maximum scroll height keeps the overview compact. The first 50 accounts are
alphabetical; View all users opens the full online table. Loading, retry, empty and
disconnected states are explicit. Guests with persisted profiles appear in the account
list; the separate anonymous count includes all connected guests.

Admin refinements: primary acquisition cards explicitly say Today new users and
Today new anonymous users. Country cells reuse CountryFlag with emoji and a country
name tooltip on hover/focus; its admin variant portals inside the shell to retain
light tokens. Active habit badges use green success tokens (#166534/#f0fdf4/#bbf7d0),
archived badges use neutral muted/subtle/line tokens. Wall rows combine author and
recipient as one non-wrapping “author → recipient” Profile wall column, with both
names linking to their profiles. The standalone Online users section is removed;
the compact overview panel now owns pagination when more than 50 accounts are online.

All metrics is a separate admin navigation section. It presents a highlighted total
registered-account count and four record cards: registration month/day, session-start
day, and unique timer-user day. Each record shows the count and full calendar period;
existing activity metrics follow without duplicating the online-user panel. Styling
uses the established admin tokens and responsive metric grid.

Beep messages adds a read-only cross-account transcript table in the same admin
tokens, with full question/reply text, account identity, reply status and Kyiv times.
Conversation details disclose the saved greeting, IDs, dates and revision. Status
filters and 50-turn pagination persist in URL state; selecting a conversation shows
its turns chronologically. The all-conversation view is newest first. No public
chat styling, composer or new visual tokens are introduced.

The `/group-study-timer` and `/study-timer` routes reuse the compact SEO workspace and registration
invitation. It places the canonical `ProjectList` in its list variant below the timer,
with project creation, nested tasks, completion and task-specific timer starts. Guest
and account persistence remain owned by `taskService` and `useQuickTasks`; no separate
local task store is introduced. Live presence still represents the shared workspace,
not a synchronized private group. Editorial copy explains that distinction below the
working area. The route is registered in `seoRoutes.ts` for discovery and the sitemap.

On `/group-study-timer` and `/study-timer`, the timer/tasks surface and presence card have separate
borders with a 24px gap. The presence column is capped at 340px and aligns to the
top with content-driven height; it never stretches alongside a growing task list.
Its empty/loading states have no reserved 180px spacer. The existing 300px list
scroll limit remains, and below 800px the two surfaces stack with a 16px gap.

### Exam study quick planner

`/exam-study-planner` uses the English, translation-excluded planner landing shell
and its metadata/schema registry. `ExamStudyPlanner` is the quick-entry variant:
exam name, native OS-owned exam date, and daily hours. Shared StudyPlanner styles
own fields/buttons; its CSS module adds a sage 25/05 rhythm preview and a seven-day
paginated agenda with compact numbered Pomodoro chips using existing pixel tokens.
Chips are buttons that prepare a session in the shared PlannerSessionTimer; each
day has one break note. A primary Prepare next Pomodoro action opens the next
uncompleted session. Completion marks persist locally until rebuilding. The timer
locks editing and session selection, supports manual breaks, and uses the existing
leave guard. Closing restores focus. Programmatically focused result headings and
timer containers have no outline; interactive controls retain visible keyboard focus.
`calculatePomodoros`, `dateKeyLocal`, and `addDays` own timing/date arithmetic.
Inline associated errors preserve inputs and focus the first invalid field;
generation focuses the result heading. Editing retains a labelled previous result.
The daily budget includes short breaks, every day is included, and exam day is
excluded. Blocks have no assigned tasks; users choose their own study material. The full plan downloads as plain text. This
quick variant saves its draft, generated plan, pagination, completion, selected
Pomodoro, and focus/break timer snapshot under `pomo:exam-study-planner:v1`.
`lib/examPlannerStorage.ts` validates restored snapshots. Running intervals use an
absolute deadline; paused intervals preserve remaining milliseconds. Restoration
finishes elapsed intervals once, without automatically starting a break. Saves
wait for hydration; storage failures expose retry and other-tab changes pause
writes until the user explicitly chooses a version. The leave guard applies only
to unsaved state. Data stays in this browser and does not sync with an account. The existing revision planner owns custom weekdays,
topic estimates, persistence, and adjustable session lengths.

## Lottie companion Mr. Beep

Beep activity uses the existing admin shell, table, filter buttons and pagination
styles. Its separate navigation section is `/admin#beep-events`; it introduces no
new visual tokens or product-facing controls.

The active artwork is the user's `public/assets/companion/rigged-tom/beep_pomo.json`,
a self-contained 400×400 Lottie animation with a six-second loop at 30 fps.
`LottieCompanionScene` uses the existing lottie-web dependency, SVG rendering and the
visibility-aware companion animation loop. The artwork is 144×144 CSS pixels, half
its previous size. Happy eyes and smile appear on pointer hover, keyboard focus or session completion;
hearts remain gated by hover/focus; the speech bubble appears only while TomGuide shows text. Ambient
playback never triggers these expressions on its own. Reduced motion freezes playback
while still updating expressions; carrying adds a small tilt. Outside work and the completion reaction, both arms stay in
their resting pose; the source loop's repeated greeting is disabled.
`WalkingCompanion` and `TomGuide` retain movement, placement, hide/show, preferences,
localized controls and guidance. The source animation is preserved. Earlier 3D/pixel renderers, their authoring scripts and unused dependencies have been removed. Shared pose types live in `companionTypes.ts`; only the active Lottie artwork is retained. Timer state controls status and roaming deferral;
`BeepWorkScene` adds a local SVG standing desk and laptop in the artwork's palette.
During a running focus/time-tracking session the character stands and types; pausing,
stopping or taking a break returns to the ambient pose. Movement waits for the desk to clear before translating; carrying immediately hides furniture. Reduced motion uses a
static working pose. The display name is Mr. Beep in English and Spanish controls,
guidance and accessible labels; internal identifiers and preference keys stay stable.
Project launch, build and typecheck remain deferred per user instructions.

### Mr. Beep reactions

`BeepReactions.ts` owns head-attached focus, sleepy and surprised faces and the
text-driven mouth. Focus uses softly rounded, slightly lowered eyes without angled brows; breaks
keep the character upright with heavy eyelids, long sleepy blinks and no furniture. Pickup takes priority over other expressions and hides furniture.
Visible guide text animates the mouth; closing text stops it immediately. The timer
store's `completionSequence` advances only through `completeSession`, including breaks
and time tracking. The companion observes that sequence without changing timer state
and shows one 2.4-second completion sequence: leave the desk, raise both arms,
smile with a small happy hop, then lower the arms. Cancellation does not trigger a jump. Completion
while the document is hidden is not replayed later. Reduced motion uses static faces,
working/resting poses and a brief happy expression without jumping, typing or talking
motion. Work transitions suspend movement until the desk clears; automatic roaming stays
off during focus, breaks and celebration. Source Lottie artwork remains unchanged.

The standing work pose preserves the source body and thruster without added legs,
shoes, chair or vertical compression. The wooden desk has a visible top edge and
separate supports. The laptop display faces Beep; the viewer sees a plain sage lid
with a small circular mark. On completion the desk clears over 450ms, Beep shifts
back over 550ms, then raises both source arms using shoulder pivots. The last 450ms
return the character and arms to neutral. Pickup cancels this sequence. Reduced
motion shows a static smile with raised arms, without the exit, hop or typing.

Work and celebration use only the two original Lottie arm layers. Shoulder pivots
bring the source hands toward the laptop with subtle angular typing motion, then
raise the same arms for celebration. No duplicate arms/hands or hide-and-replace
transition is used; original sleeve and hand colors stay consistent across poses.

Companion settings contain only wandering, animation and Hide companion; animation
preview controls are removed.

### Interactive first meeting

TomGuide and useBeepTour own a first-visit route on the home workspace:
welcome, Tasks, create project, create nested task, task selection, optional guest
registration, Sounds, Your Progress, Daily Goal, Habits, Work History, Chat, finish.
Task selection highlights both the task play button and the dropdown below the timer.
Next is available on every step, including creation steps, so users can explore
without creating another project or task. Successful saves still advance automatically.
The primary target is explicitly marked so the bubble anchors to the timer picker
while both picker and task play are highlighted. Guide actions stay outside the
scrolling description; the guide sits above the mobile navigation and yields to
both native open dialogs and authored aria-modal overlays.
Registration opens the existing AuthModal in register mode; registered accounts skip
that step. Tool steps advance on their real dock/menu button or Next; opening the
mobile menu alone does not advance.
The existing first-meeting preference and Ask Mr. Beep replay remain canonical.
Real controls receive a growth-token outline with a reduced-motion-safe pulse;
WalkingCompanion approaches each target and BeepWorkScene rotates the original arm
at its shoulder toward it. No source artwork is modified. The bubble fits above
or below the target, with internal scrolling, and yields to modal dialogs.
Mobile follows Menu → Tasks. ProjectList/useQuickTasks remain the only creation
owners: each creation step waits for a submitted form's confirmed save; failures
keep the current step and draft. Users may dismiss at any time.

### Mr. Beep AI chat

Ask Mr. Beep embeds BeepChat in the existing help bubble, with a 390px maximum width,
Inter body text, paper/sage transcript, existing token borders and growth sender names.
A bounded scrollable log, real textarea label, explicit Send/Stop, New conversation,
loading status, inline retry and provider disclosure share the existing controls.
English/Spanish follow I18nProvider; replies follow the user's message language.
The popup view survives closing and resets selection on reload/account change;
authenticated transcripts persist in private saved dialogues at /beep. Only a bounded, authenticated profile/activity summary is fetched. The original tour stays accessible.
Talking animation follows new replies rather than the waiting state. Server-side
Responses API and the knowledge-base document own answers; see docs/beep-ai.md.

The character itself is a native chat button: click/Enter/Space opens the existing
chat; moving a pressed primary pointer by 4px switches immediately to carrying
with a grabbing cursor, without a hold delay. The movement threshold tolerates
small pointer jitter during a click. Carrying never opens chat on release. The separate floating message icon
is removed. Hover/focus pauses travel. Idle wandering moves at 125px/s within 320px horizontally
and 140px vertically of its saved placement; manual moves redefine this home.
Onboarding target changes teleport Beep immediately, without a walking pose.
Tour travel remains independent and returns home when guidance finishes.

An empty chat closes immediately on a primary pointer press outside the bubble
and character. Chats with messages stay open. Outside dismissal leaves focus with
the clicked control and does not apply to the tour or welcome note.

Beep's guide/chat bubble and inline settings
follow the existing glass variant whenever product/home/tool scenery is
actually rendered. app/appearance.css owns the data-companion-controls pixel-to-
scene mapping and data-beep-surface shell, reusing canonical scene colors and
18px blur. Chat log, fields, buttons, muted labels and scrollbars inherit those
roles. A transparent guide footer avoids a second opaque surface. Default light/
dark appearances retain their existing palette; forced colors exclude the glass
variant. This also works for the globally mounted companion outside route shells.

### Compact Mr. Beep dialogue

The chat uses the existing scene-glass surface and pixel color tokens with Inter
body text. A quiet 44px name/close row sits above a single composer. Initial chat
has no greeting card, starter questions, navigation links or tour replay footer.
User turns are small right-aligned screen-token bubbles; Beep replies are plain
left-aligned text. The dialogue grows naturally to 420px, then scrolls internally;
the complete window stays within 560px and the visual viewport. The input grows
from one line to 112px. Send/Stop remain 44px icon buttons with localized names.
The composer has no disclosure footer; close is a thin 14px icon on a transparent
44px button with no border or shadow. Streaming uses a small growth-token cursor
with blinking disabled for reduced motion. Existing themes and glass mapping own
all colors; no new palette or typography is introduced.

### Mr. Beep arrival note

An optional short personal welcome uses the existing glass speech bubble, quiet
name/close row and Inter text, without a composer until clicked. The text is a
keyboard-operable button with no visible button border/background; the whole note
stays within 300px and the visual viewport. It appears without taking focus after
authentication and the first tour, while the timer is idle. Click carries the
message into the existing chat. No new colors, overlays or typography are added.

The arrival note now uses a fresh, short model-generated message and disappears
automatically after 20 seconds. Opening dialogue cancels that timeout. A welcome
after a long gap may say Beep missed the user; it never fabricates an exact absence
from presence timestamps or pressures the user. Existing geometry and styling stay
canonical.

### Saved Beep conversations

/beep and /beep/[id] reuse the personal-page frame, compact Navbar and
PersonalNavigation. The index shows one full-width list of saved conversations;
each row pairs its first-message title with the last-update date and a small
navigation chevron. Clicking a row opens a separate dialogue page with a visible
Back to all conversations link. There is no sidebar, empty composer beside the
list, or new-conversation control on these pages. The popup header exposes only
history and close, without a plus button.

The shared BeepChat page variant fills the remaining dialogue canvas and scrolls
its message log internally; input stays at the bottom. Page submission requires
a loaded saved conversation. On narrow screens, row dates wrap below titles.
Page input uses 16px type on mobile; controls retain 44px targets and visible focus.
AppearanceProvider includes /beep routes in product scenery. appearance.css maps
the list/dialogue shell to the same 18px glass blur, translucent pixel tokens and
forced-colors fallback as other product pages. app/beep/beep.css owns page geometry;
WalkingCompanion.module.css owns shared dialogue/composer geometry. No new palette
or typography is introduced, and default light/dark appearances remain unchanged.

Beep history omits the visible “Mr. Beep” page heading; a screen-reader heading
retains page structure. Auth, initial list, additional list rows and dialogue
loading use geometry-matched skeletons with the shared personal-skeleton-line
animation. All skeleton colors derive from pixel tokens and inherit scenery
glass; reduced motion uses the canonical static fallback. Decorative shapes are
hidden from assistive technology, with one localized loading status per skeleton.

The floating Beep companion mounts only at viewport widths of 720px or more,
matching the existing mobile breakpoint. Narrowing the viewport unmounts artwork,
chat/guide and their effects, rather than only hiding the renderer with CSS.
Saved-chat pages remain available on mobile. A settings icon in the chat header opens
an inline disclosure with exactly two native checkboxes (wandering and animation)
and Hide companion. There is no corner launcher, placement action or animation
preview UI. Drag and arrow-key placement remain available on the character.
Visibility, wandering, animation and home position persist in the existing browser
preference key; system reduced motion takes precedence. Hiding unmounts artwork
and guide/chat. Escape closes settings first and returns focus to the settings
icon; closing the chat returns focus to the character. The disclosure reuses the
chat's paper/glass surface, theme tokens and English/Spanish locale.


First Beep encounters use the shared English/Spanish introduction from
`lib/beepIntroduction.ts` in both guest tour step zero and the registered arrival
without signed welcome memory. Beep introduces himself, says he lives here now
and explains that users can chat and ask questions. Later arrivals retain their
existing personal greeting. First-arrival detection remains browser-local.

The Settings page includes a Mr. Beep visibility checkbox using its existing panel,
icon and checkbox styles. `store/useCompanionStore.ts` owns shared visibility for
Settings and the floating companion; the existing browser preference key remains
canonical. Changes apply immediately, including restoring a companion hidden from
chat, and preserve wandering, animation and home position. English/Spanish copy
uses the active locale; no server preference or Save settings action is required.


Mr. Beep preferences now synchronize to the signed-in account through
CompanionPersistence and `/api/beep/preferences`, retaining the same compact chat
and Settings controls. The existing local key seeds first-time account preferences;
account caches and pending writes are scoped per user. Server preference ownership
is separate from timer/profile Save settings. Settings reports synchronization and
failure in the current locale. Guests continue browser-only persistence. Home
position, visibility, wandering and animation share useCompanionStore.

### Feedback widget

The bottom-right FeedbackWidget follows compact workspace windows: a round 48px outlined
message button, 3px panel corners, sage title bar, restrained pixel heading and Inter form.
The introduction uses an inset screen surface, primary ink and a tomato edge to
separate it from the form. The first-visit prompt has a speech-bubble tail aligned
with the center of the round trigger to make their relationship visible.
`app/feedback.css` consumes existing pixel tokens; `app/appearance.css` maps the
button, prompt and panel to canonical scene colors and 18px glass blur whenever
scenery is rendered. Each floating surface owns its blur. Light/dark, reduced motion
and forced colors retain the same geometry. The anchored panel stays non-modal,
keeps its draft on dismissal, focuses the message on opening and supports Escape
with focus return. English/Spanish copy lives in `lib/i18n/feedback.ts`.

## Public project pages

Public project pages extend the existing journal identity: a wide 4:1 cover,
square project logo, quiet Inter title, four compact focus/progress statistics,
and a two-column blog/sidebar layout. The empty cover uses the existing pixel grid
and sprout; no new palette or font is introduced. Narrow layouts stack the columns
and retain a two-column statistics grid. `app/(journal)/journal.css` owns geometry;
all surfaces use the journal/pixel tokens. `AppearanceProvider` includes @profile
routes, and the existing `app/appearance.css` journal-card adapter owns glass blur,
contrast and forced-colors behavior. The editor uses the same card surface.

ProjectEditor reuses journal fields, uploads, mutation feedback and unsaved guards.
About the project is expanded initially; logo/cover uploads follow in the same left
column, beside publishing settings. This keeps the description column useful rather
than leaving a large blank area above a full-width media row. Narrow screens retain
the same details/media/publishing reading order in a single column.
Project URLs are generated server-side from the name with automatic collision suffixes;
the editor has no slug field, and editing preserves existing project URLs.
An independent required Title field comes first, followed by the project selector.
Selecting or creating a work project preserves the page title. The server saves
that title separately and uses it to generate new page URLs; editing keeps the URL.
The project field selects a real work project; inline creation is
saved atomically with its public page. The project field uses the shared
`components/journal/Select.tsx` Radix Select adapter: trigger-width, collision-aware,
height-bounded popup with 44px rows, colored folder icons, selected check and a
separate create-project row. It portals into the journal shell to inherit light,
dark and scenery tokens. `app/(journal)/journal.css` owns geometry; pixel tokens
own colors and global scrollbars. Status uses the same authored Select with universal
Not started / In progress / Paused / Completed labels and neutral activity icons;
new pages default to In progress. Archive/restore is a separate action staged until
Save project; archived records retain an explicit Archived option until restored.
Stored PLANNING/BUILDING values remain compatible; shared projectStatusLabels owns
English/Spanish labels in the editor, project list and public view. Visibility and
date controls retain the journal's accepted browser-owned popup behavior. See docs/project-journal.md for
publication, task visibility, subscription and visit semantics.

Project logo and cover uploads use the shared ImageAttachments logo/cover variants:
a square logo preview (contain) and a wide cover preview (cover), clickable to add or
replace, with a small accessible remove control. Native file controls are hidden
behind real keyboard-accessible buttons. Local previews appear during upload;
failed replacements retain the saved image. File type/2 MB validation, upload status
and inline errors stay in the shared uploader. Other attachment layouts are preserved.

ProjectEditor uses restrained Lucide cues: a sage sprout emblem, section icons,
status-specific icons, and a globe/lock for visibility. The project picker reads the
existing work-project color through projectColorStyle; work-projects API includes
that existing color field. Status and visibility always retain their text labels.
These accents use growth, accent and muted runtime roles, with no new palette.

The project editor temporarily omits the Links & dates section (website, GitHub and
start-date inputs). Existing values remain in the edit payload and are preserved.

My blog (`/@username`) groups profile identity, lifetime statistics and owner actions
in a shared journal-card glass surface. Empty project/update states reuse journal-card;
ProfileAchievements participates in the canonical scenery blur and forced-colors
adapter in app/appearance.css. Statistics use four columns, two on narrow screens.
AppearanceProvider resolves both literal and URL-encoded @ handles through the
existing usernameFromHandle helper. Default paper themes retain their tokens.

The public project's Task tree tab (`?tab=map`) is a WBS-style connected diagram:
project summary on the left, one real task per middle branch, and local subtasks
on the right. The user's reference now owns this view's explicit visual exception: always-dark
full-screen CommunityDialog task-tree variant, forest-black #101512 grid, #1c2521
cards, #151c17 subtask panels, #e1e7ed ink and #94ad7c sage progress. These scoped
runtime tokens live in journal.css and do not change the site theme. SVG Bézier
connections follow measured card positions through ResizeObserver. The three-column
canvas retains horizontal scrolling on small screens rather than stacking. The
shared dialog owns Escape, focus containment/restoration and close; its task-tree
variant locks background scrolling. Close returns to project overview. Pagination
stays inside the modal. No fictional task phases or in-progress state is introduced.
ProjectSubtasks owns owner-only addition and completion with native labeled
checkboxes and journal form controls. Storage is versioned and scoped by account,
project and task; drafts remain in the input on save failure, invalid saved data
is not overwritten, and storage events refresh other tabs. Visitors see a local-only
notice. Subtask completion never changes server task status or project progress.
The existing showTasks privacy gate and 20-task URL pagination remain authoritative.
Task tree is linked from project navigation and the task summary.

The workspace Menu links to `/projects/public` as Blogs; My Projects omits the
Explore public projects link. Make project blog sits at the right of the Project
blogs section heading as a quiet secondary action, stacking full-width on mobile.
The task edit dialog uses the same action label and existing creation route.

Project blogs management reuses the public catalog card classes and shared CSS
loaded by JournalLayout: logo/status identity, optional right-hand description,
centered focus/session metrics, equal-height rounded cards and compact owner
actions. It uses two columns then one on mobile. No public-profile shortcut is
shown. Public card titles open the project; private titles open its editor. The
stretched title link leaves edit/post/focus actions independently interactive.

When the first project-blog page loads successfully with no items, management shows
only Make project blog, right-aligned beneath the work-project list (full-width on
mobile). No section heading, empty panel or extra divider is rendered. Loading and
errors remain explicit; later empty pages retain navigation back to previous pages.

Personal updates keep a compact heading and shortcut row inside one journal-card.
Feed starts directly with its content and retains only a visually hidden page heading;
it shows all public updates newest-first, regardless of author or project follows.
The existing public-post visibility filter, sign-in requirement and pagination remain.
the introductory heading, publish action and shortcut panel are omitted on `/feed`.
Both use a separate solid-border empty-state card and secondary action.
Loading and error content also use journal-card. All
these surfaces inherit the canonical scenery blur/paper token adapter, including
forced colors; no local glass palette is added. Cards use 16px corners, controls
8px corners, and the heading/action stack on narrow screens.

BlogHeader omits My blog from navigation. The signed-in avatar opens the canonical
user profile through userProfileHref (`/user/username`), with a localized profile
accessible label. It no longer links to the public journal profile.

The Pomo blogs avatar opens the canonical user profile with `?view=blogs`. The
existing UserProfilePage has a blogs navigation variant, rendering BlogHeader in
all loading/error/content states with natural top spacing and no workspace nav.
Profile data, actions and glass adapters are reused. Without this query, user
profiles retain workspace navigation; canonical redirects preserve the query.

KofiWidget is also omitted on `/user/*?view=blogs`, including its support dialog;
query changes update this condition through useSearchParams with a null Suspense
fallback. Ordinary workspace profiles retain the support widget.

The achievements scenery surface applies to both garden-page (including embedded
blog profiles) and journal-shell: paper-token background, 20px inner padding and
a complete border accompany the shared blur. Neither shell gets blur alone.


Appearance settings keep the full-width default background separate, followed by
two complete rows of scenery (three per row on desktop), and one row each of timer fonts and
site themes, following their existing responsive grid columns. A full-width Show all / Show less control with a chevron
smoothly reveals the remaining rows downward in place and collapses them
on a second click. Reduced motion disables the transition.


## Persistent corner timer

The optional minimal timer is enabled by an immediate switch in the Timer section of the Settings page.
MinimalTimer reuses WorkspaceWindow's non-modal shell, theme adapters, persisted
position, pointer capture and keyboard movement, including mobile dragging.
The 320px panel follows the corner timer: a thin border, small offset shadow,
quiet grip-and-close header and selected-font digits beside icon-only actions.
Session type and ready/running/paused status sit above the digits; the three
mode choices share a full-width bottom strip. TimerControls owns mode selection;
TimerActions owns the shared inline icon presentation used by both timers,
including pending locks, accessible names and 44px action targets.
MinimalTimer.module.css owns the home layout; TimerActions.module.css owns inline actions.
Active sessions retain the shared mode lock; time tracking omits break choices.
Closing or Escape hides only the window and never changes the selected timer mode.
The Settings page alone changes the account-persisted minimalTimer preference.
Separate in-memory minimalTimerVisible state preserves a closed window across route
changes; enabling the mode or reloading opens it. While the mode is enabled, both
large and corner timers stay hidden even when the window is closed. A Timer entry
in the left dock and mobile tools toggles visibility, with active state and focus
restoration. The header adds compact appearance and timer-settings icons, reusing
AppearanceSettings (including theme/font/background selection) and SettingsModal.
Escape inside appearance settings closes that dialog without hiding the timer.
English/Spanish copy belongs to gardenCopy. MinimalTimer.module.css
owns content geometry; existing pixel tokens and window adapters own colors.

`PersistentTimerProvider` owns one mounted Pomodoro runtime across route changes.
Page timer slots receive its full display through a portal; leaving a slot shows
a compact bottom-left timer, with safe-area gutters, tabular digits, pause/resume,
stop and a link back to its originating timer page. The corner timer appears only
for an active or paused session; idle, stopped and completed sessions hide it.
The existing store, session services, completion flow and native picture-in-picture
window remain the shared owners; navigation does not create a second clock.
`FloatingTimer.module.css` consumes the canonical pixel paper, ink, muted, screen,
line, shadow and accent tokens and the selected timer font through `--timer-face`.
Its `data-floating-timer` marker participates in the shared site-surface, window-material
and rendered-scenery adapters, including their blur, texture, radius and shadow.
The existing system-color fallback remains active in forced colors.
English/Spanish labels come from the existing locale dictionaries. The corner
surface stays below modal layers and uses native links/buttons with visible focus.

## Spanish search homepage

`/es` reuses HomeWorkspace and the established timer, typography and theme tokens.
Its visible server-rendered guide below the workspace owns the Spanish h1,
Pomodoro instructions, study/coworking copy and FAQs. `app/es/spanish-home.css`
only adds reading-column geometry using existing paper, ink and line tokens.
The homepage URL owns language (`/` English, `/es` Spanish); browser preferences
continue to apply on other routes. Homepage language controls are crawlable links.
DocumentHtml sets the initial document language from the route; I18nProvider owns
interactive translations. Both homepages have self-canonicals and reciprocal
language alternatives. Spanish targets the language globally, not only Spain.

Workspace return links use `HomeLink` (including server-rendered blog/tool shells),
which resolves the current locale through I18nProvider. Event-driven returns use
`currentHomeHref()` at navigation time. Explicit language selectors retain their
fixed language URLs; returning from another screen must not select English.

## Spanish Pomodoro Effect

`/es/efecto-pomodoro` reuses SeoLandingPage and the minimal SeoWorkspace timer.
`lib/seoSpanishPages.ts` owns server-rendered Spanish editorial content; the Spanish
tools shell reuses existing tools.css geometry and tokens with localized navigation.
The English and Spanish effect pages have reciprocal language links, self-canonicals,
hreflang and sitemap alternatives. Both suppress scenery, companion and support-widget
chrome through the shared route registry. The Spanish homepage links to the guide.

## Spanish group study timer

`/es/temporizador-de-estudio-en-grupo` reuses the group study timer, project/task
list and live participants. Spanish copy explains that countdown controls are
individual and the participant list spans the shared workspace. The existing
Spanish tools shell, tools.css and theme tokens own presentation.
`localizedSeoPaths` owns both translated tool routes, reciprocal hreflang,
sitemap entries and language-switch destinations. The Spanish homepage links
to the group study page; WorkspaceInvite and shared section labels are localized.

## Standalone Japanese acquisition tools

The user requested three independent Japanese SEO tools, not a Japanese application
locale: `/ja/pomodoro-timer`, `/ja/focus-timer`, `/ja/25-minute-timer`.
Audience: Japanese-reading students and individual workers, on desktop and mobile,
globally including Japan. Domain is low-risk study/productivity; no Japan-specific
identity, commerce, legal, billing or regulated workflow is introduced. Evidence is
the explicit request and the existing standalone countdown contract.

`japaneseSeoRoutes.ts` owns discovery and sitemap membership; `japaneseSeoPages.ts`
owns distinct Japanese intent content, FAQs and metadata. Each route has an exact
Japanese h1, self-canonical, Japanese Open Graph metadata and JSON-LD. These pages
are independently authored, so they are not registered as translations of the app.

`JapaneseTimer` reuses `useLocalStudyTimer` and `useWakeLock`. Pomodoro supports
manual focus/break transitions, 25/5 intervals and 15-minute breaks after four
completed focus sessions. Focus offers 15/25/45/50-minute presets. The 25-minute
page is a fixed single countdown. All support pause/resume/reset, visible completion,
no audio, no history, and reset on reload or navigation away. No user text input,
IME shortcuts, dates, payments, account actions or locale selection is introduced.

`StandalonePageBoundary` renders Japanese route content outside the account,
translation, persistent coworking timer and widget providers. Analytics stays at
root level. DocumentHtml sets `lang=ja` initially. Existing English/Spanish language
preferences are not modified. The app's locale union and switcher remain unchanged.

Visual ownership: existing pixel page/paper/ink/line tokens; tools.css shell geometry;
`japanese-tools.css` provides Japanese-capable system fonts, 16px prose with 1.9 line
height, normal tracking, strict line breaks, responsive large tabular timer numerals,
44px controls and keyboard focus. No new palette or cultural decorative motif.

Verification is static per the user's instruction. Native Japanese editorial review
and rendered browser/mobile/zoom checks have not been performed.

## Spanish aesthetic timer and Pomodoro method guide

`/es/temporizador-aesthetic` reuses the aesthetic timer's static landscape,
minimal countdown, theme toggle, fullscreen boundary and ambient mixer. Existing
tools.css tokens remain the visual owner. `spanishSeoPages` owns the complete
Spanish editorial translation; `localizedSeoPaths` automatically supplies the new
route's sitemap, canonical/hreflang links and locale-switch destinations.

`/es/efecto-pomodoro` now targets método Pomodoro in its title, h1, intro and FAQs,
while retaining its effect explanation and URL. `SeoPage.showSteps` allows this
minimal guide to show a real ordered method without adding unrelated marketing
sections. Both pages link from the Spanish homepage and to related Spanish tools.
Verification remains static; no project start, builds or tsc per user instructions.

## Minimal deep work landing pages

`/deep-work-timer` and `/es/temporizador-de-trabajo-profundo` use the existing
minimal-guide shell and minimal PomodoroTimer presentation, with 50/10, 60/10 and
90/20 presets. Task/room pickers, presence, ambient mixer, account invite and long
marketing sections are omitted. The timer retains pause/reset, break controls,
settings and fullscreen; active/paused sessions cannot be overwritten by presets.
Existing tools.css and pixel tokens own all visual roles. Both routes suppress
scenery and support chrome through isMinimalSeoPath. Each has a short intro,
two explanatory paragraphs, two FAQs and related links; all SEO prose is visible.
The locale registry owns reciprocal language links, canonicals and sitemap entries.
Spanish homepage discovery links to the new route. Verification is static only.


Room overview includes a compact 400px chat panel above the participants, reusing
the homepage `Chat` component. There is no separate chat tab.
An explicit room ID scopes history, sending and live events to the viewed room
without changing the timer's selected room. The room variant owns a bounded message
scroller inside the overview column and pauses subscriptions while Overview is hidden.
Both surfaces share stored history, paging and
socket updates. History requests include authentication; private room history and
posting admit the owner or authenticated members, matching room-detail access.
History failures retain a retry action instead of falling back to socket history.

Room Overview separates the shared chat into messages-only and Activities panels.
Activities shows work/timetracking starts without a composer or typing indicator.
The Chat mode filters both paginated server history and live events, before date
grouping; the homepage keeps its existing combined view. Both windows are 400px tall.

Room Activities uses the profile activity list's `profile-session` rows and the
community panel heading: action icon, participant link, start action, optional task
and duration, and a semantic timestamp. Quiet date separators replace chat pills;
there is no chat presence dot. History and live-event behavior stay shared with Chat.

Room Overview places Weekly activity first, at full content width above the
two-column participants, chat, Activities and daily-goal panels, with a 24px gap.

Room activity entries use compact two-line cards: participant, tinted start-type
badge and 24-hour time on the first line; truncated task and duration on the second.
Focus uses tomato tokens and tracking uses sage tokens, with matching left borders.
Long names/tasks truncate with full text in title attributes to preserve row density.

## Room invitation preview

Room directory cards reuse the public project directory's stretched native title-link
pattern: the full card opens room details with a card-wide focus outline. Footer
buttons sit above the link; Open is available for joined and discovery rooms, while
Join and workspace selection remain separate actions. Existing community tokens
own hover, focus and pressed colors; card geometry stays unchanged.

Guests following a room invitation see the room identity and actual participant count
in the existing room shell. A paper/sage welcome panel with a door emblem and tomato
registration action precedes locked participant, chat and activity panels. No invented
activity or member details appear. `RoomInvitePreview` and `app/community.css` own
responsive geometry; existing runtime tokens own colors and type. The shared AuthModal
opens automatically after invitation validation, includes the room name and localized
join guidance, and retains its login/register/Google flows and native dialog behavior.
Closing it leaves the preview and both authentication actions available. The URL retains
the invitation until authenticated membership is confirmed. The invite-preview endpoint
verifies the signed invitation and current inviter membership before returning only name,
privacy and participant count; normal room-data permissions remain unchanged.


## Room directory memberships

`/rooms` always opens the directory, including Navbar links. My rooms appears above
the discovery grid, with the existing room cards, explicit Joined badges and Open
room actions. Joined cards also have a separate Set as workspace button that selects
the timer workspace without navigation or membership changes. Global remains a wide workspace banner above the discovery grid, with its globe,
original title and description, and the shared Set as workspace / Selected action. A running session disables switching to a
different room, with a visible localized explanation. Membership comes from `/api/rooms` isMember or ownership; currentRoomId
only marks the active timer workspace. Joined rooms are excluded from discovery.
Creating or joining another room retains all existing memberships; the schema and
APIs already support multiple rooms. Creation keeps its existing Pro gate and private
rooms retain invitation-based access. Loading requests cancel on account changes.

The selected room and Global banner show a green Active workspace badge at the
top and a stronger growth-color outline. Room descriptions remain independent of
selection. Workspace buttons read Set as workspace / Selected.

Homepage RoomSwitch keeps its compact arrow button above the coworker panel.
Each click cycles through Global and all owned/joined rooms from /api/rooms/mine.
It retains existing workspace styling and the running-session lock; SWR scopes
room lists by auth token and refreshes on focus. Loading disables the button;
a failed request makes the same button offer retry.


## Temporarily hidden features

Projects retain their original icons: Lucide `ListTodo` in the workspace dock
and `BookOpen` in navigation. Habits use `CalendarCheck` (calendar with a check)
across the workspace dock, desktop navigation and mobile menus.

The bottom-right feedback widget mounts only after auth loading finishes for an
authenticated, non-anonymous account. Guests do not see the button or its prompt;
signing out unmounts the widget and clears its local form state.

Work History is hidden from the workspace dock and its mobile menu. The panel
implementation and saved window state remain intact.

`lib/uiFeatures.ts` controls temporary visibility. `SHOW_MR_BEEP` is false:
the global companion and its Settings panel are not mounted. Saved preferences,
conversation history and the implementation remain available for restoring it.
`SHOW_SUPPORT_POMO` is false: the global Support Pomo Cowork widget is not mounted.
Set the respective switch to true to restore the UI.

## Room administrator exit

The room leave action uses the `CommunityDialog` room-leave variant with the
compact paywall shell, unframed close control and existing community buttons,
radio rows, avatars and theme tokens. The header contains only its title; explanatory
copy sits in the body and the room name is omitted. Administrators explicitly select a current
participant (including offline participants) before transferring ownership and
leaving. The last participant sees a permanent room/data deletion warning and
an explicit Delete room and leave action. Cancel receives initial focus.
English/Spanish copy lives in `lib/i18n/community.ts`. Participant loading errors
block confirmation and offer retry; membership conflicts refresh the choices and
require confirmation again. The leave API validates the choice and performs the
ownership change/removal or confirmed deletion in one serializable transaction.

## Room activity periods

Room Overview and `/stats` share `ActivityChart` for the calendar week/month/year
picker, previous/next navigation, duration totals, active-day/month counts and
column chart. Weeks run Monday–Sunday; years group activity by month. Both APIs
use `getActivityStats` for identical date boundaries and session attribution.
Room activity requests use independent `activityPeriod`/`activityOffset` parameters,
leaving leaderboard filters and lifetime metrics independent. Period selection is
transient local state, matching `/stats`. Room requests cancel on changes and show
loading/error/retry states. Existing pixel tokens and stats control styles own the
presentation; English/Spanish labels come from the shared translations.

The shared activity period control uses unframed chevrons and a compact date label
with a disclosure chevron. Quiet hover fills and visible keyboard focus retain
affordance; the dropdown uses the existing paper/line tokens and a subtle shadow.

Activity charts use a 240px plot and compact toolbar spacing. Periods with no
positive focus time retain the chart with zero-value columns; no no-data message is shown.
Room activity removes the inherited chart minimum height and reduces the heading gap.

## Room profiles

Room creation and owner settings reuse `RoomProfileFields`, `CommunityDialog`, and
community field/button tokens. Descriptions are optional, capped at 500 characters;
directory excerpts occupy at most three lines. Raster avatars reserve a square;
backgrounds sit behind the directory card and room header at 16% opacity over the
existing opaque surface, preserving readable ink. Broken images fall back to the
room icon or plain surface. Forced colors hides decorative backgrounds.

Room create/settings dialogs use a 620px single-column layout: editable fields
first, then two image upload tiles side by side, with shared actions below.
Empty previews reserve their avatar/landscape geometry. Below 380px the tiles
stack vertically; the existing dialog owns vertical scrolling.

Room image previews are interactive upload tiles: circular avatar and landscape
cover, themed dashed borders, persistent choose/replace captions, drag highlight,
and an explicit remove control. Both picker and drop use the same file validation;
keyboard activation opens the picker. The fields above the tiles contain only text/privacy.

The room detail header places an 80px avatar to the left of the name and eyebrow,
with a themed border and pixel shadow. On mobile it shrinks to 56px. Settings stay
on the right; actions span the header on narrow screens.

## White site theme

White is a premium Site theme, following the free Glass, Matte and Pixel choices. It uses opaque white
surfaces, neutral gray secondary surfaces and borders, dark text and the existing
tomato accent. `app/window-design.css` owns its material tokens and preview;
`app/site-appearance.css` maps them to site tokens with a pure white page.
The material stays light in either light/dark mode and with scenery enabled.
It reuses the shared appearance registry, radio cards, persistence and bootstrap.

Dark red and Ivory are premium materials after White in the theme registry.
Dark red replaces Cream with deep burgundy surfaces, warm rose accents and light
text, using a dark color scheme in either page mode. Ivory uses a softer neutral
ivory surface with beige secondary surfaces and warm gray text. Both use smooth
10px corners, restrained shadows and no paper texture. Their canonical material
tokens and miniature previews live in `app/window-design.css`, with site-wide
palette mapping in `app/site-appearance.css`. All choices after Glass, Matte and
Pixel use the existing Pro gate, restoration rules and shared paywall.

## Workspace calendar

The Calendar tool reuses WorkspaceWindow and its persisted geometry, dock entry,
mobile menu and non-modal focus behavior. The daily agenda has one compact 48px toolbar with a date/weekday trigger,
Today, previous/next arrows and a neutral add button. There is no week strip,
second date heading, event counter or empty-state banner. A floating month picker
opens on demand without moving the schedule. A slim all-day lane, fine low-contrast
hour rules, softly tinted event cards and a live current-time rule keep the agenda
quiet and spacious; hour rows remain 64px. Local-storage guidance stays screen-reader
accessible; errors and Undo remain visible while routine save notices are announced. This
keeps the reference's readable schedule while using the product's existing pixel
surface, line, ink and accent tokens, Inter text and small square corners. Overlapping
events share columns. English/Spanish copy lives in lib/i18n/calendar.ts.

Events are local to this browser and scoped by account (with a separate guest key);
there are no calendar-provider connections. The event editor replaces the agenda,
keeps drafts when the window closes and returns to the agenda after save/cancel.
Deletion offers Undo while the tool remains mounted. The month chooser reuses
react-day-picker, matching LeaderboardDateFilter. Editor date/time inputs accept
platform-owned picker geometry and locale, as in StudyPlanner. The agenda owns
scrolling; editor and month-picker content scroll independently when displayed.

## Private focus preferences

The Settings page owns a separate Your workspace section with immediate, account-backed
Minimal timer, Work offline and Hide room selector switches through useFocusPreferencesStore. They reuse settings toggle geometry,
English/Spanish gardenCopy and existing runtime tokens. Guests retain local storage. Account save/load failures preserve the current choice
and show an inline Retry action; successful changes are stored in UserSettings. Timer Settings modal does
not duplicate these preferences. Closing the minimal timer only hides its window; the dock reopens it without changing the Settings switch.
Offline means no public active timer, not operation without an internet connection:
account session/history APIs remain unchanged. ActiveSessions unmounts its contents
and the homepage removes the entire presence rail and its reserved grid column.
The socket briefly reconnects to invoke existing server presence cleanup, drops
queued timer events and suppresses starts/sync/pause/ticks/ends while private.
Chat reconnects normally. Re-enabling public mode synchronizes the current session
without fabricating another start. Saved preferences load before socket publishing;
storage events refresh committed preferences in other tabs of the same browser.
Other devices refresh on sign-in or window focus; earlier chat activity is unchanged.

### Workspace preferences previews

FocusPreferencesSettings owns the separate Your workspace settings section before
the Timer duration section. The minimal timer row pairs its label, helper and switch with a real screenshot
and caption on the right; below 900px these stack. Work offline is a compact
full-width row below a fine divider, without an image or caption. Existing
settings panel, icon and pixel tokens own colors and typography; settings.css owns
geometry and the native checkbox-based switch. The reserved 5:2 timer preview preserves image proportions without cropping. English/Spanish copy belongs to gardenCopy.
public/settings contains localized browser screenshots of the actual minimal timer
and homepage with offline focus enabled and the Active Sessions rail absent.
They were captured from the already-running local app with an isolated guest browser,
no active session, no personal data and no live socket connection. The requested
screenshots and desktop/mobile preview inspection did not start the project, run a
build or run tsc. Both preferences retain the existing persistence and behavior.

Your workspace also offers Hide room selector as a compact row below Work offline.
It shares immediate account persistence and cross-tab refresh. RoomSwitch
unmounts its chooser (and room-list fetch) when hidden; the shared main timer also
hides its inline room switch. The selected room and session remain unchanged.
Localized help links to /rooms, where the existing Set as workspace action remains
available with its normal running-session lock. Existing settings tokens own the row.

The movable minimal timer is restricted to the home workspace (/ and /es).
Navigating away hides its window without changing the mode or visibility preference;
an active/paused session uses FloatingTimer in the corner instead, including when
minimal mode is enabled. Returning home restores the movable window only if the
user had left it open. Ordinary page-owned full timer slots retain their display
when minimal mode is off. No second clock or session is created by navigation.

## Workspace preference persistence and audit

UserSettings stores minimalTimer, offline and hideRoomSwitch for authenticated
accounts. /api/settings/workspace validates boolean patches, locks the account row,
and commits the changed values and SettingsChange records in one transaction.
Unchanged values and failed saves create no events. The server is authoritative;
existing unsigned browser settings are not imported into an account. Guests keep
browser-local preferences, outside the admin audit. Visibility of the movable
window is transient and is not a settings change. Client mutations are serialized,
ignore results from prior accounts, and retain failed choices for explicit retry.
Auth restoration supplies the privacy setting before socket session publishing.

The admin Settings changes section reuses useAdminData, shared table/error/loading
styles and URL pagination (50 rows), newest first, with user, setting, before/after
and Europe/Kyiv timestamps. /api/admin/settings-changes uses authorizeAdmin and
private/no-store responses. Only these three switches are logged, as explicitly
clarified by the user; timer durations, profile and appearance are outside this log.
The new migration is additive. Prisma generation/migration are permitted; project
launch, test builds and tsc remain prohibited by the user.
