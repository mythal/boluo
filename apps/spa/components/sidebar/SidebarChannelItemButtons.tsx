import { CornerDownRight, Plus, X } from '@boluo/icons';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import {
  focusPaneAtom,
  isSingleColumnAtom,
  panesAtom,
  panesColumnCountAtom,
  type FocusPane,
} from '../../state/view.atoms';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { useIntl } from 'react-intl';
import { useMemo } from 'react';
import { selectAtom } from 'jotai/utils';

interface Props {
  active: boolean;
  channelId: string;
}

export const SidebarChannelItemButtons = ({ active, channelId }: Props) => {
  const paneLimit = usePaneLimit();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const setFocusPane = useSetAtom(focusPaneAtom);
  const store = useStore();
  const intl = useIntl();
  const labelClose = intl.formatMessage({ defaultMessage: 'Close All' });
  const labelFocus = intl.formatMessage({ defaultMessage: 'Focus Next' });
  const labelOpenNew = intl.formatMessage({ defaultMessage: 'Open New Pane' });
  const threeOrMoreColumns = useAtomValue(
    useMemo(() => selectAtom(panesColumnCountAtom, (count) => count >= 3), []),
  );

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (active) {
      setPane((panes) =>
        panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channelId),
      );
    }
  };
  const handleNew = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addPane({ type: 'CHANNEL', channelId });
  };
  const handleFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const panes = store.get(panesAtom);
    const candidates: FocusPane[] = panes.flatMap((pane) => {
      const matches: FocusPane[] = [];
      if (pane.type === 'CHANNEL' && pane.channelId === channelId) {
        matches.push({ key: pane.key, isChild: false });
      }
      const childPane = pane.child?.pane;
      if (childPane?.type === 'CHANNEL' && childPane.channelId === channelId) {
        matches.push({ key: pane.key, isChild: true });
      }
      return matches;
    });
    if (candidates.length === 0) {
      return;
    }
    const focusPane = store.get(focusPaneAtom);
    const currentIndex =
      focusPane == null
        ? -1
        : candidates.findIndex(
            ({ key, isChild }) => key === focusPane.key && isChild === focusPane.isChild,
          );

    if (currentIndex !== -1 && candidates.length === 1) {
      return;
    }
    const nextFocus =
      currentIndex === -1 ? candidates[0] : candidates[(currentIndex + 1) % candidates.length];
    if (!nextFocus) return;
    if (focusPane?.key === nextFocus.key && focusPane?.isChild === nextFocus.isChild) {
      return;
    }
    setFocusPane(nextFocus);
  };
  return (
    <div onClick={(e) => e.stopPropagation()} className="flex gap-1 px-1 py-2">
      {active && (
        <ButtonInline
          className="h-5 w-5"
          onClick={handleClose}
          aria-label={labelClose}
          title={labelClose}
        >
          <X />
        </ButtonInline>
      )}
      {active && threeOrMoreColumns && (
        <ButtonInline
          className="h-5 w-5"
          onClick={handleFocus}
          aria-label={labelFocus}
          title={labelFocus}
        >
          <CornerDownRight />
        </ButtonInline>
      )}

      {paneLimit > 1 && (
        <ButtonInline className="h-5 w-5" onClick={handleNew} aria-label={labelOpenNew}>
          <Plus />
        </ButtonInline>
      )}
    </div>
  );
};
