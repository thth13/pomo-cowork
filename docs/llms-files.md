# LLM-readable site guides

Next.js serves `public/llms.txt` and `public/llms-full.txt` directly at `/llms.txt`
and `/llms-full.txt`. Both are UTF-8 text files with Markdown content; they require
neither JavaScript nor authentication. The root layout advertises the short guide
with `<link rel="describedby" href="/llms.txt" type="text/plain">`.

`llms.txt` follows the proposed format: site name, short summary, context, and
grouped annotated links. `llms-full.txt` is an optional expanded product summary,
not a complete mirror or an export of user data. English matches the public tool
pages. Canonical links use `https://www.pomo-co.work`, as defined in `lib/site.ts`.

## Maintenance

- Update both files when public product capabilities, canonical URLs, or the
  selected pages change. They are curated static files, not generated content.
- Verify tool links against `lib/seoRoutes.ts` and `lib/plannerPages.ts`.
- Link only published blog articles (`published: true` in `content/blog`).
- Keep prices and plan limits on `/pricing` rather than duplicating volatile values.
- Exclude private workspace content and drafts. Preserve existing robots rules.
- Keep the short file concise; `/sitemap.xml` already supplies broader discovery.

After deployment, manually check that both root URLs return HTTP 200 with readable
UTF-8 text and that public HTML contains the discovery link. Hosting/CDN crawler
restrictions must be checked separately from repository configuration.

## Research and expectations

- [llms.txt proposal](https://llmstxt.org/): Markdown structure and the
  `rel="describedby"` discovery relation.
- [Google Search guidance for AI features](https://developers.google.com/search/docs/appearance/ai-features):
  ordinary SEO practices still apply; special AI text files are not required for
  inclusion in AI Overviews or AI Mode.

These files help agents that choose to read them understand the product. They do
not guarantee indexing, rankings, recommendations, or use by any specific AI service.
