export const STATUS_REFRESH_INTERVAL_MS = 30_000;

export const normalizeStatusFocus = (focus: readonly string[]): string[] =>
  [...new Set(focus)].sort();
