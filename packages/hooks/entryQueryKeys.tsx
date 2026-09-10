const componentQueryPrefix = (spaceId: string, scopeId: string) =>
  ['/entries/by_component', spaceId, scopeId] as const;
const entryQueryPrefix = (spaceId: string, scopeId: string) =>
  ['/entries/query', spaceId, scopeId] as const;

const matchesPrefix = (key: unknown, prefix: readonly string[]): boolean =>
  Array.isArray(key) && prefix.every((value, index) => key[index] === value);

export const entryQueryKeys = {
  byScope: (spaceId: string, scopeId: string) => ['/entries/by_scope', spaceId, scopeId] as const,
  byComponent: (spaceId: string, scopeId: string, componentType: string) =>
    [...componentQueryPrefix(spaceId, scopeId), componentType] as const,
  entry: (spaceId: string, scopeId: string, entryId: string) =>
    [...entryQueryPrefix(spaceId, scopeId), entryId] as const,
};

export const matchesEntryComponentQueries =
  (spaceId: string, scopeId: string) =>
  (key: unknown): boolean =>
    matchesPrefix(key, componentQueryPrefix(spaceId, scopeId));

export const matchesEntryQueries =
  (spaceId: string, scopeId: string, entryId?: string) =>
  (key: unknown): boolean =>
    matchesPrefix(
      key,
      entryId == null
        ? entryQueryPrefix(spaceId, scopeId)
        : entryQueryKeys.entry(spaceId, scopeId, entryId),
    );
