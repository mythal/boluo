import { Activity, FC, useContext } from 'react';
import { usePaneDrag } from '../hooks/usePaneDrag';
import { PaneContext } from '../state/view.context';
import clsx from 'clsx';
import { stopPropagation } from '@boluo/utils/browser';
import { useIsChildPane } from '../hooks/useIsChildPane';
import { useIntl } from 'react-intl';

export const PaneDragHandle: FC = () => {
  const { focused: isFocused, key: paneKey } = useContext(PaneContext);
  const { canDrag, onHandlePointerDown, draggingPane } = usePaneDrag();
  const isChildPane = useIsChildPane();
  const intl = useIntl();
  const isDraggingCurrentPane =
    draggingPane != null && draggingPane.key === paneKey && draggingPane.isChild === isChildPane;
  const title = intl.formatMessage({ defaultMessage: 'Move Pane' });
  return (
    <Activity mode={!canDrag ? 'hidden' : 'visible'}>
      <button
        type="button"
        aria-label={title}
        title={title}
        className={clsx(
          'rounded: absolute left-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center',
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
        <span className="not-sr-only">||</span>
      </button>
    </Activity>
  );
};
