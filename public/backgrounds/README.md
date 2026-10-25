# Generated focus wallpapers

Autumn Breeze was generated with the built-in `image_gen` tool on 2026-10-25.
This Pro scene uses a lossless 1672 × 941 PNG and a 320 × 180 PNG thumbnail.
`components/PixelAutumnEffects.tsx` animates 26 original pixel leaves with diagonal
gusts, gentle sway and flutter. The still forest is never moved. It uses the same
SVG cover coordinates, loading, pause, hidden-tab and reduced-motion behavior as
Forest Campfire. Both effects share `.pixel-scene-effects`; no video or audio is used.

Forest Campfire was generated with the built-in `image_gen` tool on 2026-10-25.
The Pro scene uses a lossless 1672 × 941 PNG and a 320 × 180 PNG thumbnail.
`components/PixelCampfireEffects.tsx` adds original SVG flame accents, firelight,
embers and fireflies animated by `app/appearance.css`; no video is used.
Its SVG coordinates match the full artwork with the same centered cover crop.
Pause/play uses the existing background preference. Hidden tabs pause the effects;
reduced motion shows only the complete still image. The image catalog entry retains
the existing image preloading, error recovery and contrast sampling behavior.

Magic Academy was generated and revised with the built-in `image_gen` tool on 2026-10-23.
It is an original fantasy academy, with a landscape JPEG at quality 84 and a 320px
gallery thumbnail at quality 75, available with active Pro access through the background catalog.
The active Gothic revision uses versioned asset paths to refresh cached backgrounds.

Generated with the built-in `image_gen` tool on 2026-10-20. These are original generated
landscapes and abstract gradients, not photographs of identified real locations. The selected outputs live in
this repository; no upload or external image host is needed for the new wallpapers.

| Catalog ID | Wallpaper | Gallery thumbnail |
| --- | --- | --- |
| alpine-dawn | images/alpine-dawn.jpg | images/alpine-dawn-thumb.jpg |
| desert-dunes | images/desert-dunes.jpg | images/desert-dunes-thumb.jpg |
| aurora-lake | images/aurora-lake.jpg | images/aurora-lake-thumb.jpg |
| magic-academy | images/magic-academy-gothic.jpg | images/magic-academy-gothic-thumb.jpg |
| pixel-campfire | images/pixel-campfire.png | images/pixel-campfire-thumb.png |
| pixel-autumn | images/pixel-autumn.png | images/pixel-autumn-thumb.png |
| peach-glow | images/peach-glow.jpg | images/peach-glow-thumb.jpg |
| mint-haze | images/mint-haze.jpg | images/mint-haze-thumb.jpg |
| violet-dusk | images/violet-dusk.jpg | images/violet-dusk-thumb.jpg |

Landscape JPEG exports use quality 84; gradients use quality 90 to preserve smooth transitions.
All gallery thumbnails are 320px wide; JPEG thumbnails use quality 75. Original PNG
outputs remain in Codex's generated-image library. The catalog is in `lib/appearance.ts`.
Existing free images and videos retain their Vercel Blob paths; video source links
remain attached to each entry in that catalog.

## Final generation prompts

**pixel-autumn**

```text
Use case: stylized-concept
Asset type: original pixel-art autumn wallpaper for a focus timer web application, widescreen 16:9, 1920x1080 if possible.
Primary request: a breathtaking peaceful autumn woodland at golden hour, a winding leaf-covered footpath beside a still narrow woodland stream, arching maple and birch trees framing the edges and upper corners with golden yellow, burnt orange and deep copper foliage. Layered distant trees fade into soft mauve and amber atmospheric haze, gentle late-afternoon light reaches a quiet clearing. Fallen leaves carpet the mossy banks; small stepping stones and reflections provide subtle storybook detail.
Style: authentic meticulously hand-crafted 16-bit pixel art, visible consistent square pixel clusters, crisp stepped silhouettes and delicate ordered dithering, limited harmonious palette, rich detail concentrated near edges, not photography and not a pixelation filter. Calm, nostalgic, beautiful.
Composition: full-bleed panoramic environmental scene with a low-detail atmospheric center for timer digits. Balanced scenic depth that also looks good with a centered mobile crop. Leafy branches enter from both top corners; a breeze is suggested by their natural asymmetric shape, but no motion blur. Warm amber and muted rust contrasted with plum shadows and cool blue-green water. Keep the overall center subdued rather than a blazing white sun.
Animation preparation: no airborne leaves, wind streaks or particles in this still image; falling leaves will be added as a separate animated layer. Ground leaves remain visible in the static fallback.
Constraints: no people, animals, buildings, tents, campfire, lettering, logos, watermark, UI, frame or collage.
```

**pixel-campfire**

```text
Use case: stylized-concept
Asset type: pixel-art forest campfire wallpaper for a focus timer, widescreen 16:9, 1920x1080 if possible.
Primary request: an exquisite quiet night-time evergreen forest campsite in true hand-crafted retro pixel art. Tall dark pine trunks and fern silhouettes frame the sides, layered blue-green pine forest recedes into a misty clearing, a little starry blue night sky peeks through the canopy. One small cozy orange campfire in a ring of stones sits at exactly 50% across and 80% down the image, with crossed logs and a narrow flame reaching up to 72% of the image height. Warm amber light pools gently on the mossy ground near the fire, contrasting with cool midnight teal and indigo trees.
Composition: wide full bleed landscape. Keep the campfire centered horizontally so it stays visible in a mobile crop. Spacious dark low-detail clearing behind the central timer area, campfire in the lower quarter, large trunks frame outer edges, subtle layered scenery. Fire is small and inviting, not a bonfire. No characters, buildings, tents or furniture.
Style: authentic highly crafted 16-bit game background, clearly visible consistent square pixel clusters, crisp stepped edges, controlled palette, subtle ordered dithering, detailed foliage at edges, nostalgic and peaceful. Not a photo with a pixelation filter; not vector art; no smooth airbrushed surfaces. Static camera.
Constraints: no lettering, logos, watermark, UI, borders. No floating embers or fireflies in the base image; these will be animated separately. Include the flame and its ground lighting for the static reduced-motion fallback.
```

**magic-academy — active Gothic revision**

The revision was edited from the initial academy artwork; only the Gothic version is retained in this repository.

```text
Use case: style-transfer
Asset type: full-bleed 16:9 scenic wallpaper for a focus timer.
Input image: edit target, the current Magic Academy wallpaper.
Primary request: transform this academy into an atmospheric medieval British school of witchcraft and wizardry, evoking the cozy, mysterious gothic boarding-school atmosphere of the Harry Potter films, with an original castle design.
Change architecture: replace the rounded observatory domes, classical arcades, glass conservatory and Mediterranean gardens with weathered dark stone Gothic halls, clustered slender towers with steep slate roofs, pointed arched windows, ivy-covered cloisters, irregular medieval courtyards and a distant stone bridge. The school should feel ancient, secluded and magical.
Change lighting: moonlit blue-hour sky with rolling clouds and a hint of faded sunset, Scottish Highland-like hills, low drifting mist above a dark still lake, many warm amber candlelit windows reflected in the water. Cinematic painterly realism, restrained detail and a peaceful study atmosphere.
Preserve: panoramic lakeside composition, architecture concentrated above the shoreline, open lake across the foreground for timer readability, full bleed landscape aspect ratio and environmental illustration quality.
Constraints: no people, text, logos, crests, watermark, UI or borders.
```

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
