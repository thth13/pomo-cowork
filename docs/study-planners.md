# Study planners and templates

Implemented on 2026-10-22 in the existing English SEO tools shell.

| Route | Purpose |
| --- | --- |
| `/weekly-study-planner` | Balance topics and estimated sessions across selected study days; school-week, reading/writing and custom templates |
| `/exam-revision-planner` | Plan topic revision, practice and mistake review through an inclusive last revision day |
| `/pomodoro-calculator` | Calculate complete focus sessions and intervening breaks inside one time budget |

The first version calculates schedules locally. It does not require an AI service,
API key, new dependency, database change, or account. Topic choice and effort
estimates belong to the user. No syllabus generation, mastery assessment, or
spaced-repetition algorithm is implied.

## Scheduling contract

- Start and end dates are inclusive, spanning at most 90 civil days. Native date
  inputs accept OS calendar behavior. Initial dates use the browser's local day;
  subsequent calendar arithmetic uses UTC date-only values to avoid DST drift.
- The exam field is **Last revision day**, normally the day before the exam. It is
  included in the plan; the app does not reinterpret it as the exam date.
- Choose available weekdays and one budget of 15–480 whole minutes for each selected
  day. Focus sessions are 5–90 minutes; breaks are 0–30 minutes.
- There are 1–12 named topics, each needing 1–100 whole sessions. Longer names are
  limited to 120 characters. These are workload estimates, not curriculum advice.
- Daily capacity is `floor((budget + break) / (focus + break))`. Only complete
  sessions count; no break follows the last session of a day. Long breaks are not
  inserted automatically. Meals and other commitments are outside the budget.
- Scheduled work is spread across selected dates. Topics rotate round-robin while
  they have remaining sessions. This does not enforce task prerequisites; users
  should check dates for work that must happen in a particular sequence.
- Demand beyond available capacity stays explicitly unscheduled, with counts by
  topic. Days are never silently extended and daily budgets are never exceeded.
- Calculator mode derives its session count from capacity, uses today's local
  date, and ignores hidden calendar/session-demand fields. When zero sessions fit,
  the output explains how to change the timing and still permits export.

## UI and persistence

`StudyPlanner` owns the three modes. Form edits preserve the last generated result,
which is clearly labelled as the previous version until the user rebuilds it.
Rebuilding clears checkmarks; Undo restores the previous snapshot. Replacing a
template or removing a topic also offers Undo. Labels say Prepare next session
then Start focus: opening the timer does not start it automatically.

`useLocalStudyTimer` owns countdown timing, pause/resume/reset, visibility updates
and cleanup. Finishing a focus countdown checks off its session once. A break is
prepared and started manually; the last session has no planned trailing break.
Closing the timer unlocks planning inputs. Timer intervals are not account focus
sessions, do not alter the main timer, and do not award statistics or achievements.
Leaving or reloading resets the clock.

Drafts, generated input and checkmarks save to `pomo:planner:v1:<mode>` in browser
localStorage, when available. The app has one current plan per mode, not a cloud
archive. Drafts survive incomplete numeric edits and are validated on generation.
Restoration validates shapes, bounds, generated input and completion IDs. Unknown
or malformed snapshots fall back to a fresh template with a visible notice.

Storage failures keep current work in memory and expose retry. Other-tab updates
pause saving until the user chooses which version to retain. Leaving with an
active local timer or unresolved persistence uses the existing unsaved-change
dialog (English planner variant); browser unload uses its native lifecycle guard.
No new global toast, modal, scrollbar, or session-service owner is introduced.

CSV contains every scheduled row, intervening breaks, completion and unscheduled
topic summaries. Topic cells are quoted and protected against spreadsheet formulas.
Printing reveals all schedule days, including those outside the current seven-day
view, and hides editing controls, navigation, and the temporary clock. A printed
or exported plan is a snapshot; it does not update with later edits.

## SEO integration

`lib/plannerPages.ts` owns the distinct metadata and server-rendered practical
content, visible FAQs and template examples. `PlannerLandingPage` renders canonical,
Open Graph, WebPage/WebApplication/BreadcrumbList and matching FAQ schema. The
separate planner registry feeds the sitemap, homepage planner links and route
classification. The existing tools header/footer links to the weekly planner;
the three planners link to each other and relevant timers. Robots policy is unchanged.

## Manual acceptance

No application, tests, build or tsc is run for this task. These are user-owned checks:

1. Open all three routes, including with JavaScript disabled; inspect metadata,
   sitemap, editorial text, FAQ/schema agreement and navigation links.
2. Weekly: generate the example, edit a topic, confirm stale-result guidance,
   rebuild, check a session, switch templates and Undo. Refresh and confirm draft,
   generated plan and completion restore without restoring the active clock.
3. Invalid form cases: blank values, invalid/reversed dates, >90 days, no weekdays,
   no selected weekday in the range, blank names, fractional/negative/oversized
   durations and counts. Expect associated errors and first-invalid-field focus.
4. Calculator: 120/25/5 = 4 sessions, 100 focus minutes, 15 break minutes and 5 spare;
   60/25/5 = 2 sessions and 5 spare; 120/50/10 = 2 sessions and 10 spare;
   15/25/5 = zero sessions and an actionable notice. Break zero still works.
5. Overload: one selected day with budget60/focus25/break5 and demand5 schedules
   two sessions and leaves three unscheduled. Export must include those three.
6. Select dates across a DST boundary; count selected dates and inspect calendar
   captions. Exam output includes exactly the displayed last revision day.
7. Prepare/start/pause/resume/reset a session. Completion checks it off once;
   prepare/start the break. Leaving warns and resets only this local clock.
8. Test blocked/full storage, retry, malformed saved JSON, and two tabs editing the
   same mode. One tab must not silently overwrite the other's save. Numeric input
   such as `1e2` must survive local restore when supported by the browser.
9. Download a full and overloaded plan; inspect break-after zero on each day's last
   session and spreadsheet safety with a topic starting `=`, `+`, `-`, or `@`.
10. Print a plan longer than seven selected days: every day should appear, without
    navigation, controls, scenery, fixed widgets or timer. Check light/dark themes,
    keyboard operation, native date picker, narrow/short screens and reduced motion.
