export const shouldCheckCharacterIdentifier = (
  identifier: string,
  originalIdentifier: string | null,
): boolean => originalIdentifier == null || identifier.trim() !== originalIdentifier;
