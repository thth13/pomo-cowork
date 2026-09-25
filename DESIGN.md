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

The signature is a living pocket garden beside an LCD-like timer. Keep the surrounding
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

1240px centered shell; 28px gaps and 32px desktop gutters. Main workspace has a broad
focus/community column and a narrower companion/daily-progress column. Tasks, chat
and history follow in three columns. At 1023px, spacing reduces; at 719px the order
is timer, garden/daily progress, community, tasks, chat, history. Document owns scroll.

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
