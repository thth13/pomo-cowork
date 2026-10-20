# Premium focus wallpapers

Generated with the built-in `image_gen` tool on 2026-10-20. These are original generated
landscapes and abstract gradients, not photographs of identified real locations. The selected outputs live in
this repository; no upload or external image host is needed for the new wallpapers.

| Catalog ID | Wallpaper | Gallery thumbnail |
| --- | --- | --- |
| alpine-dawn | images/alpine-dawn.jpg | images/alpine-dawn-thumb.jpg |
| desert-dunes | images/desert-dunes.jpg | images/desert-dunes-thumb.jpg |
| aurora-lake | images/aurora-lake.jpg | images/aurora-lake-thumb.jpg |
| peach-glow | images/peach-glow.jpg | images/peach-glow-thumb.jpg |
| mint-haze | images/mint-haze.jpg | images/mint-haze-thumb.jpg |
| violet-dusk | images/violet-dusk.jpg | images/violet-dusk-thumb.jpg |

Landscape JPEG exports use quality 84; gradients use quality 90 to preserve smooth transitions.
All gallery thumbnails are 320px wide at quality 75. Original PNG
outputs remain in Codex's generated-image library. The catalog is in `lib/appearance.ts`.
Existing free images and videos retain their Vercel Blob paths; video source links
remain attached to each entry in that catalog.

## Final generation prompts

Each landscape used the following shared prompt, replacing `{scene}` with the exact text below:

```text
Use case: photorealistic-natural
Asset type: premium scenic wallpaper for a focus timer web application.
Primary request: {scene}
Style: polished natural landscape photography, realistic texture, restrained atmospheric colors, peaceful and not distracting.
Composition: wide 16:9 landscape, 2048x1152 if possible; large uninterrupted low-detail central region for timer digits, scenery concentrated toward edges and lower third; full bleed, single cohesive scene.
Constraints: no text, numbers, logos, watermarks, borders, UI, people or collage.
```

**alpine-dawn**

```text
A peaceful alpine mountain valley at dawn, layered blue gray ridgelines, distant snowy peaks softly lit with peach light, low fine mist, calm open sky. No buildings or people.
```

**desert-dunes**

```text
Quiet flowing sand dunes in a vast desert at blue hour, soft terracotta sand with muted mauve shadows, subtle warm peach horizon and a spacious dusky sky. No people or structures.
```

**aurora-lake**

```text
A quiet northern lake at night under a gentle sage green aurora, distant dark pine forest and low mountains reflected in still water, deep blue sky with faint stars. No buildings or people.
```

## Final gradient generation prompts

Each gradient used the following shared prompt, replacing `{palette}` with the exact text below:

```text
Use case: stylized-concept
Asset type: aesthetic abstract gradient wallpaper for a focus timer application.
Primary request: a beautiful minimal gradient background, nothing else.
Color palette and composition: {palette}
Style: softly blurred mesh gradient, large seamless organic transitions, delicate barely visible dither for smooth color, polished and restful.
Framing: single full-bleed wide 16:9 image, 2048x1152 if possible; low visual complexity through the central area for timer digits, composed to also crop gracefully on mobile.
Constraints: gradient colors only; no objects, landscape, horizon, clouds in a literal sky, mountains, water, spheres, ribbons, hard edges, illustrations, text, numbers, logos, UI, borders, watermarks, or collage.
```

**peach-glow**

```text
Peach Glow: luminous apricot and pale peach flowing into dusty rose and soft lilac, with a warm creamy glow. Broad asymmetric clouds of color, gentle lavender near the edges, peach toward the lower center.
```

**mint-haze**

```text
Mint Haze: airy seafoam and muted mint flowing into powder blue and pale buttercream, with restrained sage accents. Broad diagonal color diffusion, a calm luminous center, soft cool corners.
```

**violet-dusk**

```text
Violet Dusk: velvety indigo and periwinkle flowing into muted orchid and dusty pink, with a subtle lavender glow. Darker blue outer edges and a broad soft violet center; elegant night-time mood, no neon.
```
