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
theme controls; guests can navigate and sign in. The leaderboard and statistics reuse this compact menu; other routes retain their header.
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
Only real sessions appear in the rail and online count; mock participants are removed.
Coworkers form a vertical list with 40px avatars on the left and names, activities,
time, status and a remaining-time meter on the right. Time tracking shows elapsed time
without a fictional remaining-time meter. The current user keeps a tomato edge accent and
You label. Room pages keep their detailed session cards. Above 719px the list owns vertical scrolling.
Flat rows use fine dividers, with the time aligned opposite the status. Pixel digits and slim progress tracks carry the identity. The English H1, “Online Pomodoro Timer for Focused Work”, and Pomodoro overview
live inside the About the timer workspace window, opened by the question-mark dock
button. The window is closed by default and never restored on page load, even if left
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
Bodies scroll internally and stay mounted to preserve tasks, drafts and live updates.
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
The heading has no promotional subtitle or description. It follows the Pocket Garden
identity with a pixel display heading, a quiet
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
of their workflows. The locked preview is bounded and inert for keyboard users.
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

The fourteen routes in `lib/seoRoutes.ts` use the document-scrolling `app/(tools)` shell.
The English copy in `lib/seoPages.ts` is rendered on the server and excluded from
DOM translation. Inter owns the readable headings and prose; the pixel face remains
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
sessions keep their timing. The existing settings modal remains the duration owner;
subsequent visitor changes are not overwritten by page presets. Reset on these pages
uses the shared stop/cancel operation; time tracking retains the Stop label.
FAQ disclosures are native details/summary and their full answers render server-side.
Metadata, canonical URLs, WebApplication/FAQ JSON-LD and sitemap entries are shared
in implementation, while search intent, examples, benefits, FAQs and related links
are written separately for each route. No ranking or rich-result promise is made.

About the timer includes a server-rendered Focus Tools navigation list for all fourteen
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

## Personal timer appearance

The timer's icon-only Appearance button sits at the top beside Settings, with a localized
accessible name and tooltip. On narrow screens the status sits below the icon row.
It opens a native modal dialog with a compact scenery
gallery and five digit previews. The default remains Pocket Garden and pixel digits.
Three generated aesthetic landscapes and three locally hosted Mixkit videos provide
optional scenery; `public/backgrounds/README.md` records sources and generation prompts.
`lib/appearance.ts` owns the catalog; `app/appearance.css` owns its shared presentation.
Scenery appears on home and the search timer pages. Existing room backgrounds keep
their own owner. Personal choice is shared per browser, independent of the account.

Chosen scenery fills the viewport beneath the page. At the user's request, surfaces
behind the timer, online rail and editorial text use a barely tinted glass treatment:
12% page color with 6px backdrop blur; timer and rail borders use 25% line color.
`app/appearance.css` derives these from existing theme tokens in both themes.
The left workspace dock shares the same glass tint and blur without its hard shadow.
`useSceneryContrast` samples the image crop beneath each glass surface and chooses
white or near-black (`#101914`) foregrounds using relative luminance, accounting for
the wash and tint. Video uses its poster for stable color rather than changing per frame.
`app/appearance.css` owns `--scenery-ink` and `--scenery-shadow`; a subtle contrasting
text shadow helps over image details. These roles affect exposed glass text/icons only;
opaque controls, tooltips and dialogs retain theme colors. Sampling updates after image
load, viewport/layout changes, scrolling and theme changes. Forced colors restores
opaque system surfaces and CanvasText without blur or text shadow. Contrast over each
scene and moving video still requires manual visual verification.
The gallery uses native radio inputs, visible selection checks and keyboard focus;
it scrolls within a bounded dialog while the header and Done action remain reachable.
English/Spanish text follows I18nProvider via `lib/i18n/appearance.ts`.

`data-timer-font` maps pixel, system sans, Georgia, Courier New and Trebuchet MS to
`--timer-face` in `app/appearance.css`, with local fallbacks. Only timer numerals change,
including the native mini window; existing size/line-height remains stable. UI and
body typography retain their previous owners. No extra font request is introduced.
Video is muted and loops, with a persistent pause control. Reduced-motion users get
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

The public profile has a minimal paper header with the Pomo Cowork home link,
back-to-timer link and shared compact Navbar menu. The menu sits in the header's
normal flow with an anchored overlay; the header wraps on narrow screens and stays
visible in loading/error states. Profile content starts below it with 32px spacing
(24px on phones), without the floating menu's previous top clearance.

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
