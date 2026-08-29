const normalizeVersion = (version: string | null | undefined): string | null => {
  const normalized = version?.trim();
  return normalized && normalized !== 'unknown' ? normalized : null;
};

export const readVersion = (value: unknown): string | null => {
  if (typeof value !== 'object' || value == null || !('version' in value)) return null;
  return typeof value.version === 'string' ? value.version : null;
};

export const findNewVersion = (
  currentVersion: string | null | undefined,
  latestVersion: string | null | undefined,
  dismissedVersion: string | null,
): string | null => {
  const current = normalizeVersion(currentVersion);
  const latest = normalizeVersion(latestVersion);
  if (current == null || latest == null || latest === current || latest === dismissedVersion) {
    return null;
  }
  return latest;
};
