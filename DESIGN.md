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
The background uses a faint 32px grid with soft sage and tomato washes at the edges;
a page-colored central wash keeps the timer readable. All layers derive from existing
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

The homepage replaces the full header with a small fixed Menu disclosure at the top
right. It reuses Navbar navigation, account actions, notifications, online status and
theme controls; guests can navigate and sign in. Other routes retain their header.
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
place it below the timer in a bounded grid row. On desktop the rail aligns to the right
edge of the page content without auto margins; equal inline padding centers the empty state.
Only real sessions appear in the rail and online count; mock participants are removed.
Coworkers form a vertical list with 40px avatars on the left and names, activities,
time, status and a remaining-time meter on the right. Time tracking shows elapsed time
without a fictional remaining-time meter. The current user keeps a tomato edge accent and
You label. Room pages keep their detailed session cards. The list owns vertical scrolling at every width.
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
Its five icon-only buttons have fine separators, localized accessible names and native
tooltips; the progress tooltip includes the current experience rank. The homepage has no document scrolling or inline introductory text. The timer
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
