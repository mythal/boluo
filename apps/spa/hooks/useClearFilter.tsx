import { useCallback } from 'react';
import { useChannelAtoms } from './useChannelAtoms';
import { useSetAtom } from 'jotai';

export const useClearFilter = () => {
  const { filterAtom, showArchivedAtom } = useChannelAtoms();
  const setFilter = useSetAtom(filterAtom);
  const setShowArchived = useSetAtom(showArchivedAtom);
  return useCallback(() => {
    setFilter('ALL');
    setShowArchived(true);
  }, [setFilter, setShowArchived]);
};
