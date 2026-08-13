import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { panesAtom } from '../state/view.atoms';
import { usePaneToggle } from './usePaneToggle';

export const useToggleCharacterPane = (spaceId: string) => {
  const panes = useAtomValue(panesAtom);
  const toggleCharacterPane = usePaneToggle();
  const toggleCharacterChildPane = usePaneToggle({ child: '1/3' });

  const isCharacterPaneOpen = useCallback(
    (characterId: string): boolean =>
      panes.some((pane) => {
        const matches = (candidate: typeof pane | typeof pane.child) => {
          const data = candidate && 'pane' in candidate ? candidate.pane : candidate;
          return (
            data?.type === 'CHARACTER' &&
            data.spaceId === spaceId &&
            data.characterId === characterId
          );
        };
        return matches(pane) || matches(pane.child);
      }),
    [panes, spaceId],
  );

  const toggleCharacterDetails = useCallback(
    (characterId: string) => {
      const pane = { type: 'CHARACTER' as const, spaceId, characterId };
      if (isCharacterPaneOpen(characterId)) {
        toggleCharacterPane(pane);
      } else {
        toggleCharacterChildPane(pane);
      }
    },
    [isCharacterPaneOpen, spaceId, toggleCharacterChildPane, toggleCharacterPane],
  );

  return { isCharacterPaneOpen, toggleCharacterDetails };
};
