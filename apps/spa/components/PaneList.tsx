import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, type ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSendStatus } from '../hooks/useSendStatus';
import { PaneDragProvider } from '../hooks/usePaneDrag';
import { usePaneDragController } from '../hooks/usePaneDragController';
import { focusPaneAtom, panesAtom } from '../state/view.atoms';
import { usePaneLimit } from '../hooks/useMaxPane';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';

interface Props {
  defaultPane?: ReactNode;
}

export const PaneList: FC<Props> = ({ defaultPane }) => {
  useSendStatus();
  const panes = useAtomValue(panesAtom);
  const setPanes = useSetAtom(panesAtom);
  const setFocusPane = useSetAtom(focusPaneAtom);
  const maxPane = usePaneLimit();
  const visiblePanes = useMemo(() => panes.slice(0, maxPane), [maxPane, panes]);
  const draggablePaneCount = useMemo(
    () => visiblePanes.reduce((count, pane) => count + 1 + (pane.child ? 1 : 0), 0),
    [visiblePanes],
  );
  const canDrag = draggablePaneCount > 1;

  const { dragContextValue, indicator } = usePaneDragController({
    visiblePanes,
    maxPane,
    canDrag,
    setPanes: (fn) => setPanes(fn),
    setFocusPane: (focus) => setFocusPane(focus),
  });

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
    <PaneDragProvider value={dragContextValue}>
      <>
        {renderedPanes}
        {indicator
          ? createPortal(
              <div
                className={`pointer-events-none fixed bg-blue-500/30 ${indicator.kind === 'insert' ? '-translate-x-1/2' : 'rounded-sm'}`}
                style={{
                  left: indicator.left,
                  top: indicator.top,
                  height: indicator.height,
                  width: indicator.width,
                }}
              />,
              document.body,
            )
          : null}
      </>
    </PaneDragProvider>
  );
};
