import { atom } from 'jotai';
import { atomWithHash } from 'jotai-location';
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

const baseFocusPaneAtom = atom<number | null>(null);

export const focusPaneAtom = atom<number | null, [number], void>(
  (get) => get(baseFocusPaneAtom) || get(panesAtom)[0]?.key || null,
  (_get, set, paneKey: number) => {
    set(baseFocusPaneAtom, paneKey);
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

export const findNextPaneKey = (panes: Pane[]) => {
  if (panes.length === 0) {
    return 1;
  }
  // TODO: reuse empty position
  return Math.max(...panes.map(pane => pane.key)) + 1;
};
