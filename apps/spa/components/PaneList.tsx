import { useAtomValue } from 'jotai';
import { type FC, type ReactNode, useMemo } from 'react';
import { useSendStatus } from '../hooks/useSendStatus';
import { panesAtom } from '../state/view.atoms';
import { usePaneLimit } from '../hooks/useMaxPane';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { PaneDragController } from './pane-channel/PaneDragController';
import { PaneIndicator } from './PaneIndicator';

interface Props {
  defaultPane?: ReactNode;
}

export const PaneList: FC<Props> = ({ defaultPane }) => {
  useSendStatus();
  const panes = useAtomValue(panesAtom);
  const maxPane = usePaneLimit();
  const visiblePanes = useMemo(() => panes.slice(0, maxPane), [maxPane, panes]);

  const renderedPanes = useMemo(() => {
    if (visiblePanes.length === 0) {
      return null;
    }
    return visiblePanes.map((pane) => <ChatPaneSwitch key={pane.key} pane={pane} />);
  }, [visiblePanes]);

  if (panes.length === 0) {
    return defaultPane || <PaneEmpty />;
  }

  return (
    <>
      <PaneDragController visiblePanes={visiblePanes}>{renderedPanes}</PaneDragController>
      <PaneIndicator />
    </>
  );
};
