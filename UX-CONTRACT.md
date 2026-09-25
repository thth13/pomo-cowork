# UI ownership and behavior

## Sources

- User redesign request: pixel identity, sprout companion, care and work as food.
- README.md: coworking timer, tasks, real-time presence and statistics.
- services/sessionService.ts and components/PomodoroTimer.tsx: session lifecycle and completion.
- store/useTimerStore.ts: running/paused state and countdown.
- Existing API routes remain authoritative for permissions, billing and user data.
  This change introduces no server schema or authorization changes.

## Canonical UI map

| Capability | Owner | Behavior |
| --- | --- | --- |
| Timer / session transitions | PomodoroTimer, TimerControls, useTimerStore, sessionService | Preserve existing start/pause/resume/stop/complete operations |
| Task selection | TaskPicker | Existing authored picker; reused |
| Forms and settings | SettingsModal, existing .input and .btn | Existing settings workflow; shared visual adaptation |
| Scrollbar | app/globals.css | Global visible baseline, theme tokens and forced-color fallback |
| Notifications | useNotifications / NotificationToast | Existing global session feedback |
| Progress / rank | TodayContribution / lib/ranks.ts / useAuthStore | Dock opens existing progress panel; localized current XP rank stays visible on its button |
| Presence surface | ActiveSessions | Homepage uses borderless page variant; room screens retain panel variant |
| Companion feedback | PocketGarden | Local, stable role=status region; no overlay or focus stealing |
| Companion state | usePetStore | Local browser persistence; localStorage failures fall back to memory with visible notice |
| Theme | useThemeStore / ThemeProvider | Existing light/dark selection |
| Locale | I18nProvider | English and Spanish, including new companion copy |
| Homepage navigation | Navbar compact variant | Shared navigation disclosure; outside click and Escape dismiss; Escape restores trigger focus; guests retain navigation and login |
| Workspace overlays | WorkspaceWindow | Compact non-modal windows; pointer/touch dragging and resizing with keyboard arrows; viewport bounds; click/focus stacking; Escape/close/dock dismissal; mounted content preserves drafts |
| CRUD / permissions | Existing task, room and auth services/API routes | No workflow or permission changes |

## Companion rules

A new companion starts with 65 fullness, 75 happiness, 70 water and no food. A successfully
saved completed focus session awards one food per 25 minutes (minimum one for sessions
of at least one minute) and experience equal to its whole focus minutes. A stopped
TIME_TRACKING session awards only its actual whole worked minutes, after successful
save. Cancelled regular pomodoros and breaks award nothing. Session IDs deduplicate
rewards within the retained local history; the existing timer guards duplicate completion.
Historical server sessions are not imported. Level increases every 100 focus minutes;
stage changes at levels 3 and 5. The garden gains a flower at level 3.

Feed consumes one food and restores up to 30 fullness. Pet restores up to 25 happiness;
water restores up to 30 water, each with a separate 30-minute cooldown. Full meters
disable their corresponding action. Fullness declines by 2/hour, happiness by 1/hour,
water by 1.5/hour, clamped to zero. Time away never kills the companion or removes XP.
Needs refresh when the panel opens, every 30 seconds and on focus. Storage events refresh
other open garden tabs. This is a shared companion per browser, not account/cloud sync;
clearing site storage resets it. Cross-tab simultaneous mutations have localStorage's
last-write-wins behavior, not transactional server guarantees.

Care stays in place, updates the corresponding meter, briefly changes the character's
expression, and announces localized feedback. Unavailable food and cooldowns have
visible explanations. Storage unavailable: actions continue in memory and the footer
explains the progress will not survive closing the page.

## Verification

Homepage chat, history, tasks and progress open through WorkspaceWindow from a bottom dock. Multiple windows can remain open;
the background stays interactive. Closing from inside restores focus to the opener.
The retired free-month promotion is no longer mounted in the shared layout.
No new remote searches or server mutations other than existing session saves.
Static review covers completion vs cancellation, break exclusion, cooldown guards,
no-food guard, persistence fallback, locales and responsive rules. Browser verification
is pending because the user requested to run and test the project themselves.

The homepage companion is temporarily commented out; its implementation and stored state remain intact.
