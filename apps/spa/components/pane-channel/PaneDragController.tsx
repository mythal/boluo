import { type FC, type ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PaneDragContext } from '../../hooks/usePaneDrag';
import { useSetAtom } from 'jotai';
import { focusPaneAtom, panesAtom } from '../../state/view.atoms';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { usePaneDragController } from '../../hooks/usePaneDragController';
import { type Pane } from '../../state/view.types';

interface Props {
  children: ReactNode;
  visiblePanes: Pane[];
}

export const PaneDragController: FC<Props> = ({ children, visiblePanes }) => {
  const setPanes = useSetAtom(panesAtom);
  const setFocusPane = useSetAtom(focusPaneAtom);
  const maxPane = usePaneLimit();
  const draggablePaneCount = useMemo(
    () => visiblePanes.reduce((count, pane) => count + 1 + (pane.child ? 1 : 0), 0),
    [visiblePanes],
  );
  const canDrag = draggablePaneCount > 1;

  const { dragContextValue, indicator } = usePaneDragController({
    visiblePanes,
    maxPane,
    canDrag,
    setPanes,
    setFocusPane,
  });
  return (
    <PaneDragContext.Provider value={dragContextValue}>
      {children}
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
    </PaneDragContext.Provider>
  );
};
