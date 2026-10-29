# Project planning design preview

Open `/projects/demo` directly. The project list does not link to this preview.
The preview is accessible without sign-in and has noindex metadata.

This is an interactive design prototype. Project planning, AI suggestions, subscriptions,
likes, journal entries and focus totals are in-memory sample data. Refreshing or leaving
the page resets them. There are no project API, database, account timer, or AI-service
changes. The sample date is October 28, 2026.

## Design and behavior

- Inherits the journal shell, pixel theme tokens, Inter, and light/dark appearance.
  CSS modules scope the prototype. No global visual tokens change.
- Uses English/Spanish through `I18nProvider`; authored form content stays as entered.
- Four tabs separate the plan, upcoming calendar, project journal, and global goal.
- Content uses an opaque light/dark surface, even over scenery. The plan prioritizes
  stages, tasks and a single focus action; journal content stays in its own tab.
- Task details/checklists and schedule settings expand on demand. Deadline overruns
  remain visible even when settings are closed. Mobile places focus before tasks.
- Four compact stage buttons connect tasks to readable 25-minute session counts. Task completion and recorded
  focus time are separate: a checkbox does not invent completed sessions.
- Edit project opens the goal, outcome, deadline, weekly workdays, daily hours, and pace.
  AI generation is represented by deterministic sample plans, not a model call.
- Study, exam, software, and weekly templates replace the sample plan after the user
  reviews the prefilled goal form. This clears the previous demo progress and journal.
- Tasks can be added, edited, deleted with inline confirmation, rescheduled and
  prioritized. Creation inherits the selected stage and calendar day.
- The calendar splits unfinished tasks into daily 25-minute allocations. Working
  days are consecutive weekdays starting Monday; breaks are outside the focus budget.
  If the workload extends past the deadline, the companion panel explains this.
- Rebalancing moves remaining work from the sample date while retaining completed
  tasks and logged time. Updated task dates remain editable afterwards.
- The assistant explains the next pending task and offers an actionable checklist.
  Completed estimates can be reviewed and checked off, or increased in the editor.
- `useLocalStudyTimer` owns the isolated countdown. Pause/resume, stop without credit,
  natural completion, and **Preview session complete** operate only on sample totals.
- Journal posts include a snapshot of cumulative project focus time. Following and
  reactions are interactive demonstrations; updates are never publicly published.
- `CommunityDialog`, journal `Field`/`Area`, and `NotificationToast` own modal focus,
  input semantics, and feedback. Tabs support arrow keys, Home, and End.

## Verification

Redesign verification: targeted ESLint passed for `ProjectDemo.tsx`. The strict UI
audit reports an existing native-select ownership issue in `app/stats/page.tsx`.
The application, builds, tests, and `tsc` were not run, as requested.
Browser rendering and interaction verification remain user-owned.

Suggested walkthrough: open every tab, expand the assistant, complete a demo session,
move a task, rebalance the plan, publish a demo update, toggle following, and preview
each template. Check a narrow viewport, dark theme, Spanish, and keyboard navigation.
