export const beepTourSteps = ['introduction', 'tasks', 'create_project', 'create_task', 'choose_task', 'registration', 'sounds', 'progress', 'daily_goal', 'habits', 'work_history', 'community_chat', 'finish'] as const
export const beepActions = [
  'tour_next', 'tour_skip', 'tour_finish', 'close', 'close_escape', 'saved_chats', 'welcome_open',
  'chat_open', 'chat_send', 'chat_retry', 'chat_stop', 'chat_reload', 'chat_earlier',
  'history_refresh', 'history_open', 'history_more', 'history_back', 'history_sign_in',
  'controls_open', 'controls_close', 'model_retry', 'move_toggle', 'wander_toggle', 'visibility_toggle',
  'preview_idle', 'preview_focus', 'preview_break', 'preview_happy', 'preview_held', 'preview_speaking', 'preview_completion', 'preview_stop',
  'target_menu', 'target_tasks', 'target_project', 'target_project_color', 'target_project_expand', 'target_task', 'target_task_play', 'target_task_picker',
  'target_register', 'target_sounds', 'target_progress', 'target_goal', 'target_habits', 'target_history', 'target_chat',
] as const
export type BeepAction = typeof beepActions[number]
export type BeepSurface = 'tour' | 'welcome' | 'chat' | 'character' | 'controls' | 'page'
