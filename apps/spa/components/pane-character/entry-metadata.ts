// Keep these client-side constraints aligned with the server's Entry metadata validators.
export const ENTRY_DISPLAY_NAME_MIN_LENGTH = 2;
export const ENTRY_DISPLAY_NAME_MAX_LENGTH = 32;
export const ENTRY_KEY_MAX_LENGTH = 64;

export const truncateUnicode = (value: string, maxLength: number): string =>
  Array.from(value).slice(0, maxLength).join('');

export const isValidEntryDisplayName = (displayName: string): boolean => {
  const length = Array.from(displayName.trim()).length;
  return length >= ENTRY_DISPLAY_NAME_MIN_LENGTH && length <= ENTRY_DISPLAY_NAME_MAX_LENGTH;
};

export const isValidEntryKey = (key: string): boolean => {
  const normalizedKey = key.trim();
  const length = Array.from(normalizedKey).length;
  return (
    length >= 1 &&
    length <= ENTRY_KEY_MAX_LENGTH &&
    /^[\p{L}\p{N}\p{M}\p{So}.。_%?？:：、・—-]+$/u.test(normalizedKey)
  );
};
