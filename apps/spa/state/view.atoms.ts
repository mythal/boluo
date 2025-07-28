import { atom, WritableAtom } from 'jotai';
import { atomWithHash } from 'jotai-location';
import { selectAtom } from 'jotai/utils';
import { isUuid } from '@boluo/utils';
import { type Pane, type Route } from './view.types';
import { recordError } from '../error';

export const setHash = (searchParams: string) => {
  const parsed = new URLSearchParams(searchParams);
  for (const key of parsed.keys()) {
    if (parsed.get(key) === '') {
      parsed.delete(key);
    }
  }
  const hash = parsed.toString();
  try {
    window.location.hash = hash;
  } catch (e) {
    // Sometimes setting the hash can fail,
    // This is not a critical error
    recordError('Failed to set hash', { hash, error: e });
  }
};

const routeDeserialize = (raw: string): string => {
  if (raw === '' || raw === '/') {
    return '';
  }
  if (raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1);
  }
  if (isUuid(raw)) {
    return raw;
  } else {
    return '404';
  }
};

const routeSerialize = (route: string): string => route;

const routeHashAtom = atomWithHash<string>('route', '', {
  deserialize: routeDeserialize,
  serialize: routeSerialize,
  setHash,
});

export const routeAtom = atom<Route, [Route], void>(
  (get): Route => {
    const raw = get(routeHashAtom);
    if (raw === '/' || raw === '') {
      return { type: 'ROOT' };
    } else if (isUuid(raw)) {
      return { type: 'SPACE', spaceId: raw };
    }
    return { type: 'NOT_FOUND' };
  },
  (get, set, route: Route) => {
    if (route.type === 'NOT_FOUND') {
      set(routeHashAtom, '404');
    } else if (route.type === 'ROOT') {
      set(routeHashAtom, '');
    } else if (route.type === 'SPACE') {
      set(routeHashAtom, route.spaceId);
    }
  },
);

interface FocusRecord {
  key: number;
  timestamp: number;
}

const focusRecordAtom = atom<FocusRecord | null>(null);

export const focusPaneAtom = atom<number | null, [number], void>(
  (get): number | null => {
    const creationMap = get(panesCreationTimeMapAtom);
    const focusRecord = get(focusRecordAtom);
    const entries = [...creationMap.entries()].sort((a, b) => b[1] - a[1]);
    const first = entries[0];
    if (!first) {
      return null;
    }
    const [firstKey, firstTime] = first;
    if (focusRecord != null) {
      const { timestamp, key } = focusRecord;
      if (creationMap.has(key) && timestamp > firstTime) {
        return key;
      }
    }
    return firstKey;
  },
  (get, set, key: number) => {
    const creationMap = get(panesCreationTimeMapAtom);
    if (creationMap.has(key)) {
      const time = new Date().getTime();
      set(focusRecordAtom, { key, timestamp: time });
    }
  },
);

const paneDeserialize = (raw: string): Pane[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Pane[]) : [];
  } catch (e) {
    return [];
  }
};

const paneSerialize = (panes: Pane[]): string => {
  if (panes.length === 0) {
    return '';
  }
  return JSON.stringify(panes);
};

type PaneAtomSet = ((prev: Pane[]) => Pane[]) | Pane[];
export type PaneAtom = WritableAtom<Pane[], [PaneAtomSet], void>;

export const panesAtom: PaneAtom = atomWithHash<Pane[]>('panes', [], {
  deserialize: paneDeserialize,
  serialize: paneSerialize,
  setHash,
});

export const panesCountAtom = selectAtom(panesAtom, (panes) => panes.length);

export const isNoPaneAtom = selectAtom(panesCountAtom, (count) => count === 0);

export const panesCreationTimeMapAtom = selectAtom(
  panesAtom,
  (panes, prevMap: Map<number, number> | undefined): Map<number, number> => {
    const map = new Map<number, number>();
    const now = new Date().getTime();
    if (!prevMap) {
      for (const pane of panes) {
        map.set(pane.key, now);
      }
    } else {
      for (const pane of panes) {
        if (prevMap.has(pane.key)) {
          map.set(pane.key, prevMap.get(pane.key)!);
        } else {
          map.set(pane.key, now);
        }
      }
    }
    return map;
  },
);

export const findNextPaneKey = (panes: Pane[]) => {
  if (panes.length === 0) {
    return 0;
  }
  // This is quadratic, but the number of panes is expected to be small
  for (let i = 0; i <= panes.length; i++) {
    if (panes.findIndex((pane) => pane.key === i) === -1) {
      return i;
    }
  }
  return Math.max(...panes.map((pane) => pane.key)) + 1;
};
