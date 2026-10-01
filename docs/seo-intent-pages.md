# Intent-specific SEO timers

The first ten requested intents are covered by nine new routes and an update to
`/aesthetic-timer`. The proposed second ten routes remain future scope.

| Route | Working experience |
| --- | --- |
| `/aesthetic-timer` | Static landscape, minimal shared timer, ambient mixer, fullscreen |
| `/aesthetic-pomodoro-timer` | Landscape, shared work/break cycle, ambient mixer, fullscreen |
| `/lofi-timer` | Ambient mixer exposed alongside Pomodoro; no claimed lofi music stream |
| `/fullscreen-timer` | Prominent fullscreen control, large shared countdown |
| `/flip-clock` | Device-local clock, animated digits, 12/24 hours, optional seconds |
| `/minimalist-study-timer` | Shared task/timer controls, actual online count, no coworker feed |
| `/deep-work-timer` | Default 50/10 and 50/10, 60/10, 90/20 presets |
| `/exam-timer` | Local one-shot countdown, custom minutes, no automatic break logic |
| `/reading-timer` | Local book title, countdown/stopwatch, 10/20/30-minute presets |
| `/coding-timer` | Default 50/10, longer presets, existing task/project selection |

SEO data uses the existing canonical, Open Graph, Twitter, WebPage and FAQ schema
shell. `seoRoutes.ts` supplies both sitemap entries and the homepage's Focus Tools
links. Each route has its own authored explanation, steps, FAQs and related links.

## Manual acceptance

The application, builds and tsc were not run, as requested. Verify in the browser:

- Open all ten routes directly. Check headings, initial durations, canonical URLs,
  server HTML, related links and `/sitemap.xml`.
- Start or pause a main Pomodoro, then navigate to an intent Pomodoro route. It must
  preserve the current session. Deep-work/coding presets must stay disabled until
  the session ends or is reset. When idle, each preset must set both work and break.
- Enter fullscreen by clicking Fullscreen; exit via the button and Escape. Neither
  action should start/reset a session. Test the expanded fallback on an unsupported
  browser and verify keyboard focus, settings, task menu and page scroll restoration.
- On coding, sign in and select a project before starting. Complete a focus session
  and review its attribution in the existing project journal. Guests should see
  the explanatory sign-in copy, not a nonfunctional project field.
- On exam, try blank, fractional, zero, negative and >1440-minute values. Invalid
  input must disable Start. Valid input/preselection updates the digits. Start,
  pause, resume, reset, and finish a one-minute attempt; zero shows a visual notice
  with no automatic restart or break. Background and return to the tab.
- On reading, name a book and exercise both countdown and stopwatch. Starting locks
  mode/duration until reset. Switching back after invalid input must never show NaN.
  Navigation/reload clears local state as stated on the page; no saved session is created.
- On flip clock, verify local time/date, 12/24-hour transitions, seconds visibility,
  fullscreen, and reduced-motion behavior.
- On aesthetic/lofi, audio remains silent until a click. Mix tracks, adjust volume,
  retry unavailable audio, and verify sound stops after leaving the page.
- Check English/Spanish controls, light/dark themes, 320px viewport, keyboard focus,
  and large digits at the maximum countdown duration.

## Static verification

Targeted npm ESLint passed. `git diff --check` passed. Registry inspection confirmed
47 unique tool slugs with matching page files and valid related links for new pages.
The premium static audit reported the same two pre-existing findings recorded in
`premium-audit.json`: native-select ownership in `app/stats/page.tsx` and textarea
resize styling in `app/settings/page.tsx`. Its new output is in
`/tmp/pomo-seo-premium-audit.json`; unrelated pages were not changed.

The optional DESIGN.md CLI lint could not run: `npx --no-install -p
@google/design.md designmd lint DESIGN.md` failed with `ENOTFOUND registry.npmjs.org`.
No package was installed. Runtime validation remains outstanding for the user.
