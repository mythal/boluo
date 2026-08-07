import type { EntryComponent, EntryComponentMatch } from '@boluo/api';
import { ENTRY_DISPLAY_NAME_MAX_LENGTH, truncateUnicode } from './entry-metadata';

export const PORTRAIT_COMPONENT_TYPE = 'core/portrait';
// Keep this aligned with the server's core/portrait Component limit.
export const MAX_PORTRAIT_COUNT = 6;

const PORTRAIT_KEY_RANDOM_LENGTH = 6;
const ASSET_NAME_MAX_LENGTH = 100;
const RANDOM_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export interface PortraitData {
  assetId: string;
  version: string;
}

export const parsePortraitComponent = (
  component: EntryComponent | undefined,
): PortraitData | null => {
  if (component == null || component.payloadType !== 'ASSET') return null;
  return { assetId: component.assetId, version: component.version };
};

export const sortPortraitEntries = (
  entries: EntryComponentMatch[] | undefined,
): EntryComponentMatch[] =>
  [...(entries ?? [])]
    .filter((entry) => parsePortraitComponent(entry.component) != null)
    .sort((a, b) => a.pos - b.pos);

export const reorderPortraitEntries = (
  entries: EntryComponentMatch[],
  activeId: string,
  overId: string,
): EntryComponentMatch[] => {
  const ordered = sortPortraitEntries(entries);
  const activeIndex = ordered.findIndex((entry) => entry.id === activeId);
  const overIndex = ordered.findIndex((entry) => entry.id === overId);
  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return ordered;
  const [activeEntry] = ordered.splice(activeIndex, 1);
  if (activeEntry == null) return ordered;
  ordered.splice(overIndex, 0, activeEntry);
  return ordered;
};

export const makePortraitEntryKey = (
  date: Date = new Date(),
  random: () => number = Math.random,
): string => {
  const localTimestamp = [
    date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0'),
    date.getSeconds().toString().padStart(2, '0'),
  ].join('');
  let suffix = '';
  for (let index = 0; index < PORTRAIT_KEY_RANDOM_LENGTH; index += 1) {
    const letterIndex = Math.floor(random() * RANDOM_LETTERS.length);
    suffix += RANDOM_LETTERS[Math.min(letterIndex, RANDOM_LETTERS.length - 1)];
  }
  return `portrait-${localTimestamp}-${suffix}`;
};

export const makePortraitDisplayName = (characterName: string): string =>
  truncateUnicode(`Portrait - ${characterName}`, ENTRY_DISPLAY_NAME_MAX_LENGTH);

export const makePortraitAssetName = (filename: string, characterName: string): string => {
  const name = filename.trim() || makePortraitDisplayName(characterName);
  return truncateUnicode(name, ASSET_NAME_MAX_LENGTH);
};
