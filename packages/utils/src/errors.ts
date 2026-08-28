const CHUNK_LOAD_ERROR_PATTERNS = [
  /Loading (?:CSS )?chunk/i,
  /Failed to load chunk/i,
  /Failed to fetch dynamically imported module/i,
  /Error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
  /is not a valid JavaScript MIME type/i,
];

export const isChunkLoadError = (error: unknown): error is Error =>
  error instanceof Error &&
  (error.name === 'ChunkLoadError' ||
    CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(error.message)));

const MAX_THROWN_VALUE_LENGTH = 2_000;

const truncated = (value: string): string =>
  value.length <= MAX_THROWN_VALUE_LENGTH ? value : `${value.slice(0, MAX_THROWN_VALUE_LENGTH)}…`;

export const describeThrownValue = (value: unknown): string => {
  if (typeof value === 'string') return truncated(value);

  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(value, (_key, nestedValue: unknown) => {
      if (nestedValue instanceof Error) {
        if (seen.has(nestedValue)) return '[Circular]';
        seen.add(nestedValue);
        return {
          ...Object.fromEntries(Object.entries(nestedValue)),
          name: nestedValue.name,
          message: nestedValue.message,
          stack: nestedValue.stack,
          cause: 'cause' in nestedValue ? nestedValue.cause : undefined,
        };
      }
      if (typeof Response !== 'undefined' && nestedValue instanceof Response) {
        if (seen.has(nestedValue)) return '[Circular]';
        seen.add(nestedValue);
        return {
          status: nestedValue.status,
          statusText: nestedValue.statusText,
          url: nestedValue.url,
          type: nestedValue.type,
          redirected: nestedValue.redirected,
        };
      }
      if (typeof nestedValue === 'bigint') return `${nestedValue}n`;
      if (typeof nestedValue === 'symbol' || typeof nestedValue === 'function') {
        return String(nestedValue);
      }
      if (typeof nestedValue === 'object' && nestedValue != null) {
        if (seen.has(nestedValue)) return '[Circular]';
        seen.add(nestedValue);
      }
      return nestedValue;
    });
    if (serialized != null) return truncated(serialized);
  } catch {
    // Fall through to String for objects that cannot be inspected or serialized.
  }

  try {
    return truncated(String(value));
  } catch {
    return 'Unknown thrown value';
  }
};
