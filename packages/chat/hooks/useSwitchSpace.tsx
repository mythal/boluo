import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { sidebarContentStateAtom } from '../state/ui.atoms';
import { panesAtom, routeAtom } from '../state/view.atoms';

export const useSwitchSpace = () => {
  const setRoute = useSetAtom(routeAtom);
  const setPanes = useSetAtom(panesAtom);
  const setSidebarContentState = useSetAtom(sidebarContentStateAtom);
  return useCallback(
    (spaceId: string) => {
      setRoute({ type: 'SPACE', spaceId });
      setPanes([]);
      setSidebarContentState('CHANNELS');
    },
    [setPanes, setRoute, setSidebarContentState],
  );
};
