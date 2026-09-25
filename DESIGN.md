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
The homepage uses a centered 960px shell with a 640px timer. Timer and coworker strip
form one vertically centered group with a 16px section gap, rather than giving the
timer its own full viewport. Symmetric safe-area padding keeps controls clear of the
menu and dock; short screens grow naturally and scroll. The currently working strip
sits immediately below the timer controls: a single horizontal row of
184px square coworker tiles with outlined paper surfaces and offset pixel shadows.
Avatars are 64px squares with 6px corners; bold names, pixel time and a divided
status footer make presence readable. The current user has a tomato outline and You label. Overflow scrolls
horizontally; room pages keep their detailed session cards. Both sections share the page background without outer section borders; individual
coworker tiles use card surfaces and shadows. Pixel digits and a slim segmented progress track carry the identity. The timer has no
visible section heading or tagline. A compact inline Current task picker sits directly
below Start/session actions and above the session-type controls.
Chat, history, tasks and Your Progress open from a fixed four-item bottom dock; the
progress button always displays the current localized experience rank. At 719px the
dock stacks icons above labels. Document owns page scroll, with bottom clearance for
the dock and safe area. PocketGarden stays commented out rather than deleted.
WorkspaceWindow owns compact, non-modal floating panels (360px wide, at most 480px tall).
They open along the right edge with a small stagger; multiple panels may stay open.
The sage title bar is a pointer/touch drag handle with arrow-key movement; dragging and
viewport resize keep windows within screen bounds. Click/focus raises a panel. Escape
closes the focused panel; the dock toggles it. No backdrop, page scroll lock or focus trap.
Bodies scroll internally and stay mounted to preserve tasks, drafts and live updates.
Open/closed state persists in `pomo:windows:open:v1` and restores before the workspace
appears. Only known panel IDs are restored; unavailable storage falls back to memory.
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
