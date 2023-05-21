import { atom } from 'jotai';
import { atomWithHash } from 'jotai-location';
import { selectAtom } from 'jotai/utils';
import { isUuid } from 'utils';
import { Pane, Route } from './view.types';

const routeDeserialize = (raw: string): string => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : '404';
  } catch (e) {
    return '404';
  }
};

const routeHashAtom = atomWithHash<string>('route', '', { deserialize: routeDeserialize });

export const routeAtom = atom<Route, [Route], void>(
  (get): Route => {
    const raw = get(routeHashAtom).trim();
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
    if (focusRecord !== null) {
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
    return Array.isArray(parsed) ? parsed as Pane[] : [];
  } catch (e) {
    return [];
  }
};

export const panesAtom = atomWithHash<Pane[]>('panes', [], { deserialize: paneDeserialize });

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
    return 1;
  }
  // TODO: reuse empty position
  return Math.max(...panes.map(pane => pane.key)) + 1;
};
