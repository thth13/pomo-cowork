// Both duration and remainingSeconds use PostgreSQL Int columns. Bound writes
// so converting minutes to seconds also fits, without imposing a new daily cap.
export const MAX_SESSION_SECONDS = 2_147_483_647
export const MAX_SESSION_MINUTES = Math.floor(MAX_SESSION_SECONDS / 60)
