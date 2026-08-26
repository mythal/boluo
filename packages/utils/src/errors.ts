export const isChunkLoadError = (error: unknown): error is Error => {
  return error instanceof Error && error.message.includes('Loading chunk');
};

const MAX_THROWN_VALUE_LENGTH = 2_000;

const truncated = (value: string): string =>
  value.length <= MAX_THROWN_VALUE_LENGTH
    ? value
    : `${value.slice(0, MAX_THROWN_VALUE_LENGTH)}…`;

export const describeThrownValue = (value: unknown): string => {
  if (typeof value === 'string') return truncated(value);

  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(value, (_key, nestedValue: unknown) => {
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
