import { Activity, FC, useContext, useMemo } from 'react';
import { usePaneDrag } from '../hooks/usePaneDrag';
import { PaneContext } from '../state/view.context';
import clsx from 'clsx';
import { stopPropagation } from '@boluo/utils/browser';
import GripVertical from '@boluo/icons/GripVertical';
import { useIsChildPane } from '../hooks/useIsChildPane';

export const PaneDragHandle: FC = () => {
  const { focused: isFocused, key: paneKey } = useContext(PaneContext);
  const { canDrag, onHandlePointerDown, draggingPane } = usePaneDrag();
  const isChildPane = useIsChildPane();
  const icon = useMemo(() => <GripVertical className="h-3 w-3" />, []);
  const isDraggingCurrentPane =
    draggingPane != null && draggingPane.key === paneKey && draggingPane.isChild === isChildPane;
  return (
    <Activity mode={!canDrag ? 'hidden' : 'visible'}>
      <button
        type="button"
        aria-label="Reorder pane"
        className={clsx(
          'rounded: absolute left-1 inline-flex h-6 w-6 shrink-0 items-center justify-center',
          isDraggingCurrentPane ? 'bg-surface-strong opacity-70' : 'hover:bg-surface-strong',
          'cursor-grab active:cursor-grabbing',
          isFocused ? 'text-text-subtle' : 'text-text-subtle/50',
          'hover:text-text-secondary',
        )}
        onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
          if (!onHandlePointerDown || !canDrag || paneKey == null) return;
          onHandlePointerDown(paneKey, isChildPane, event);
        }}
        onClick={stopPropagation}
      >
        {icon}
      </button>
    </Activity>
  );
};
