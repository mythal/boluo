import { type FC, use, useState } from 'react';
import { usePaneDrag } from '../hooks/usePaneDrag';
import { PaneContext } from '../state/view.context';
import clsx from 'clsx';
import { useIsChildPane } from '../hooks/useIsChildPane';
import { useIntl } from 'react-intl';
import {
  offset,
  shift,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { PaneDragPopover } from './PaneDragPopover';
import { useAtomValue } from 'jotai';
import { isSingleColumnAtom } from '../state/view.atoms';

export const PaneDragHandle: FC = () => {
  const { focused: isFocused, key: paneKey } = use(PaneContext);
  const { canDrag, onHandlePointerDown, draggingPane } = usePaneDrag();
  const isSingleColumn = useAtomValue(isSingleColumnAtom);
  const isChildPane = useIsChildPane();
  const intl = useIntl();
  const isDraggingCurrentPane =
    draggingPane != null && draggingPane.key === paneKey && draggingPane.isChild === isChildPane;
  const [showPopover, setShowPopover] = useState(false);
  const [wasDragging, setWasDragging] = useState(isDraggingCurrentPane);
  if (wasDragging !== isDraggingCurrentPane) {
    setWasDragging(isDraggingCurrentPane);
    if (isDraggingCurrentPane) {
      setShowPopover(false);
    }
  }
  const { refs, floatingStyles, context } = useFloating({
    open: showPopover,
    onOpenChange: setShowPopover,
    middleware: [shift({ padding: 4 }), offset({ mainAxis: 4 })],
    placement: 'bottom-start',
  });
  const { setReference, setFloating } = useFloatingSetters(refs);
  const hover = useHover(context, {
    delay: { open: 40, close: 400 },
    enabled: !isDraggingCurrentPane,
    move: true,
  });
  const dismiss = useDismiss(context, {});
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss]);
  const title = intl.formatMessage({ defaultMessage: 'Move Pane' });
  if (!canDrag || (isSingleColumn && !isChildPane)) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        aria-label={title}
        ref={setReference}
        className={clsx(
          'rounded: absolute left-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center',
          isDraggingCurrentPane ? 'bg-surface-strong opacity-70' : 'hover:bg-surface-strong',
          'cursor-grab active:cursor-grabbing',
          isFocused ? 'text-text-subtle' : 'text-text-subtle/50',
          'hover:text-text-secondary',
        )}
        {...getReferenceProps({
          onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
            if (!onHandlePointerDown || !canDrag || paneKey == null) return;
            onHandlePointerDown(paneKey, isChildPane, event);
          },
        })}
      >
        <span className="not-sr-only">||</span>
      </button>
      <TooltipBox
        show={showPopover}
        ref={setFloating}
        style={floatingStyles}
        defaultStyle
        className=""
        {...getFloatingProps()}
      >
        <PaneDragPopover isChild={isChildPane} />
      </TooltipBox>
    </>
  );
};
