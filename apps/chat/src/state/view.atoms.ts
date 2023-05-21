import { atom } from 'jotai';
import { atomWithHash } from 'jotai-location';
import { store } from 'store';
import { isUuid } from 'utils';
import { makeChatAction } from './chat.actions';
import { chatAtom } from './chat.atoms';
import { Pane, Route } from './view.types';

const routeHashAtom = atomWithHash('route', '');

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

export const focusPaneAtom = atom<number | null>(null);

export const panesAtom = atomWithHash<Pane[]>('panes', []);

export const findNextPaneKey = (panes: Pane[]) => {
  if (panes.length === 0) {
    return 1;
  }
  // TODO: reuse empty position
  return Math.max(...panes.map(pane => pane.key)) + 1;
};
