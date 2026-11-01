# Daily Flow

Daily Flow is a homepage timer mode. The Open Daily Flow button in Timer settings
replaces ordinary Pomodoro in the central focus station, keeping workspace tools
and coworkers available. The Pomodoro button returns to the ordinary timer.
`useWorkspaceModeStore` persists the selected mode in this browser. Existing links
to `/daily-flow` redirect to `/?mode=daily-flow`; the homepage selects Flow and
removes the mode parameter. English/Spanish follow I18nProvider.

## Ownership and behavior

- `components/DailyFlow.tsx`: planning, current task, summary and day-by-day history.
- `components/HomeWorkspace.tsx`, `store/useWorkspaceModeStore.ts`: homepage placement
  and browser-persisted timer mode; `SettingsModal` owns the Open Daily Flow button.
- `lib/dailyFlow.ts`: versioned snapshot validation, pause-safe elapsed-time cursor,
  local calendar days and summaries. It never completes a task on a timer event.
- `store/useDailyFlowStore.ts`: queue/draft/history persistence and conflict recovery.
- `components/DailyFlowPersistence.tsx`: account/guest scope, shared timer subscription,
  page-exit flush and fallback accounting while the Flow page is unmounted.
- `PomodoroTimer`, `TimerControls`, `useSessionRestore`, `sessionService`: existing
  session lifecycle, server synchronization, sounds, settings, breaks and auto-start.
  `/api/timer` can also return the saved session by ID, always scoped to its owner,
  so a later ordinary session cannot conceal an earlier Flow session’s early stop.
- `TimerPictureInPicture`: the same controls, with a current-task caption instead of
  a picker in Flow mode.

Planning and quick add reuse TaskPicker to select an unfinished task from inside
a project. Project headings only expand their lists and cannot be selected. Each
expanded project offers a task input and Add task button (Enter also submits).
Creation saves a real task through useQuickTasks/taskService with the fixed parent;
the user then selects it to add it to the Flow queue. Failed creation retains the
draft and shows an inline error; repeated pending submissions are blocked. Imported entries retain their source ID and project caption;
items already queued or completed on the current Flow day cannot be added twice.
Removing an entry allows adding it again. Existing snapshots remain compatible.
Titles are copied: renaming or completing a Flow entry does not change the source.
Tasks remain independent of projects and their task records. Flow sessions
suppress existing project/task association, leaving ordinary selection intact.
Switching or completing a task in the middle of a work session checkpoints time and
assigns subsequent work to the next task. The session itself continues. Completing
the last task uses the existing stop handler and opens the daily summary. Finish My
Day persists an explicit finished state. Add more tasks reopens planning.

The running cursor stores session ID, elapsed high-water mark and current task ID.
Each checkpoint adds only new work seconds. Pauses and breaks add none; switching
from temporary to server session IDs keeps the same elapsed mark. Work is bounded
by session duration, including after sleeping or closing the browser. Local midnight
splits daily totals; unfinished tasks and their accumulated time remain in the queue.
History shows completion dates, total task focus, that day's contribution, daily
completed count and focus total (including work on unfinished or removed tasks).

Storage key: `pomo:daily-flow:v1:<account-or-anonymous-id>`. Lists and history are
**local to this browser**, without cross-device sync. Account timer state still uses
the existing server. A second tab changing Flow data suspends writes in this tab and
offers explicit loading of the latest state. Failed storage writes retain in-memory
progress and show retry; the unload warning applies while persistence is unresolved.
Unreadable snapshots are never silently overwritten. Removal is reversible with Undo;
the task's recorded focus remains available in daily statistics.

## Manual verification

The user requested no project startup, build or typecheck. These checks are intended
for the user's local run:

0. Enable Daily flow mode in timer settings: stay on `/` with Flow replacing the
   timer. Open chat/tasks, check coworkers, reload, and return via Pomodoro. Confirm
   mode persistence, saved queue/session, mobile document scrolling, desktop panel
   scrolling and the legacy `/daily-flow` redirect. Use the Flow Pomodoro button to return to the ordinary timer.
1. Open Choose tasks from projects, expand a project and select its task. Confirm
   project headings only expand and cannot be added to Flow. Create a task with the
   project input and Add task button or Enter; confirm it appears in Projects, then
   select it for the day. Check blank input, IME composition, failed creation/retry
   and duplicate submission guards. Rename, reorder, remove, Undo and reload Flow.
   Confirm project captions, disabled duplicates (also after completion),
   removal/re-add, reload, empty/loading/retry and adding during a running session.
   Confirm the ordinary timer selection and original task status stay unchanged.
2. Start Focus: only the current title is visible. Pause/resume, switch break types,
   adjust timer settings and open the mini timer. It must not expose other tasks.
3. Complete or skip a task halfway through work: keep the same countdown; credit
   earlier seconds to the previous task and later seconds to the next one. Repeat
   during a pause and during a break; neither should accrue extra focus.
4. Let a work session expire and continue through a break and another work session.
   Keep the same task until Complete Task is clicked. Confirm multiple-session totals.
5. Complete the last task during work and during a break. Stop the timer, display
   the summary, finish the day, reload, then add more work and restart.
6. Browse history while work is running. Return to the same timer and task. Navigate
   to ordinary Pomodoro and back; preserve the queue and avoid project/task credits
   for a Flow session. New ordinary sessions must not accrue Flow time.
7. Reload an active and paused session as a guest and as an account. Compare task
   seconds before and after; include a session that expired while the browser closed.
8. Cross local midnight with a running session, and reopen yesterday's unfinished
   list. Preserve tasks, offer continuation, and separate the two days' time.
9. Change Flow from another tab. Show the conflict, prevent stale writes, and resume
   from the latest progress. Switch accounts and verify isolation.
10. Check failed localStorage writes, timer-sync errors/retry, long titles, English/
    Spanish, light/dark themes, mobile width, keyboard controls and reduced motion.

Time-accounting regression cases are in `lib/dailyFlow.test.ts` (not run during implementation).

Static checks: ESLint on touched files; frontend premium static audit. No build,
server, typecheck or runtime test is required by this change's implementation workflow.
