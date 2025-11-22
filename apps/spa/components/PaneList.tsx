import { useAtomValue, useSetAtom } from 'jotai';
import {
  type FC,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSendStatus } from '../hooks/useSendStatus';
import { PaneDragProvider } from '../hooks/usePaneDrag';
import { focusPaneAtom, panesAtom } from '../state/view.atoms';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { usePaneLimit } from '../hooks/useMaxPane';
import { createPortal } from 'react-dom';
import { clamp } from '@boluo/utils/number';

interface Props {
  defaultPane?: ReactNode;
}

interface DragState {
  key: number;
  pointerId: number;
  dropIndex: number;
  rects: Map<number, DOMRect>;
}

const move = <T,>(list: T[], from: number, to: number) => {
  if (from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item == null) return list;
  const targetIndex = from < to ? to - 1 : to;
  next.splice(targetIndex, 0, item);
  return next;
};

const getDropIndex = (pointerX: number, paneKeys: number[], rects: Map<number, DOMRect>) => {
  const orderedRects = paneKeys
    .map((key) => rects.get(key))
    .map((rect, index) => ({ rect, index }))
    .filter(
      (item): item is { rect: DOMRect; index: number } =>
        item.rect !== undefined && item.rect !== null,
    );
  for (const { rect, index } of orderedRects) {
    const mid = rect.left + rect.width / 2;
    if (pointerX < mid) return index;
  }
  return orderedRects.length;
};

export const PaneList: FC<Props> = ({ defaultPane }) => {
  useSendStatus();
  const panes = useAtomValue(panesAtom);
  const setPanes = useSetAtom(panesAtom);
  const setFocusPane = useSetAtom(focusPaneAtom);
  const maxPane = usePaneLimit();
  const visiblePanes = useMemo(() => panes.slice(0, maxPane), [maxPane, panes]);
  const canDrag = visiblePanes.length > 1 && maxPane > 1;

  const paneRefs = useRef(new Map<number, HTMLDivElement | null>());
  const registerPaneRef = useCallback((key: number, node: HTMLDivElement | null) => {
    if (node) {
      paneRefs.current.set(key, node);
    } else {
      paneRefs.current.delete(key);
    }
  }, []);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const handlePointerDown = useCallback(
    (paneKey: number, event: ReactPointerEvent<HTMLElement>) => {
      if (!canDrag) return;
      const rects = new Map<number, DOMRect>();
      paneRefs.current.forEach((node, key) => {
        if (node) {
          rects.set(key, node.getBoundingClientRect());
        }
      });
      if (!rects.has(paneKey)) return;
      const pointerId = event.pointerId;
      const x = event.clientX;
      const currentIndex = visiblePanes.findIndex((pane) => pane.key === paneKey);
      const dropIndex =
        currentIndex === -1
          ? getDropIndex(
              x,
              visiblePanes.map((pane) => pane.key),
              rects,
            )
          : currentIndex;
      setFocusPane(paneKey);
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(pointerId);
      setDragState({ key: paneKey, pointerId, rects, dropIndex });
    },
    [canDrag, setFocusPane, visiblePanes],
  );

  const isDragging = dragState != null;

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      const x = event.clientX;
      setDragState((state) => {
        if (!state) return state;
        const nextDropIndex = getDropIndex(
          x,
          visiblePanes.map((pane) => pane.key),
          state.rects,
        );
        return { ...state, dropIndex: nextDropIndex };
      });
      event.preventDefault();
    };
    const handleUp = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      event.preventDefault();
      setDragState(null);
      const fromIndex = visiblePanes.findIndex((pane) => pane.key === state.key);
      if (fromIndex === -1) return;
      const toIndex = clamp(state.dropIndex, 0, visiblePanes.length);
      if (fromIndex === toIndex) return;
      setPanes((prev) => {
        const visible = prev.slice(0, maxPane);
        const rest = prev.slice(maxPane);
        const currentFromIndex = visible.findIndex((pane) => pane.key === state.key);
        if (currentFromIndex === -1) return prev;
        const nextVisible = move(visible, currentFromIndex, toIndex);
        return [...nextVisible, ...rest];
      });
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDragging, maxPane, setPanes, visiblePanes]);

  const indicatorLeft = useMemo(() => {
    if (!dragState) return null;
    const visibleKeys = visiblePanes.map((pane) => pane.key);
    if (visibleKeys.length === 0) return null;
    const fromIndex = visibleKeys.findIndex((key) => key === dragState.key);
    if (fromIndex !== -1) {
      // No indicator if dropping to the same place
      if (dragState.dropIndex === fromIndex || dragState.dropIndex === fromIndex + 1) {
        return null;
      }
    }
    const rects = dragState.rects;
    if (dragState.dropIndex <= 0) {
      const firstRect = rects.get(visibleKeys[0]!);
      return firstRect ? firstRect.left : null;
    }
    if (dragState.dropIndex >= visibleKeys.length) {
      const lastRect = rects.get(visibleKeys[visibleKeys.length - 1]!);
      return lastRect ? lastRect.right : null;
    }
    const prevRect = rects.get(visibleKeys[dragState.dropIndex - 1]!);
    return prevRect ? prevRect.right : null;
  }, [dragState, visiblePanes]);

  const indicatorBox = useMemo(() => {
    if (!dragState) return null;
    const rects = [...dragState.rects.values()];
    if (rects.length === 0) return null;
    const top = Math.min(...rects.map((rect) => rect.top));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return { top, height: bottom - top };
  }, [dragState]);

  const draggingKey = dragState?.key ?? null;
  const dragContextValue = useMemo(
    () => ({
      canDrag,
      draggingKey,
      onHandlePointerDown: handlePointerDown,
      registerPaneRef,
    }),
    [canDrag, draggingKey, handlePointerDown, registerPaneRef],
  );

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
        {dragState && indicatorLeft != null && indicatorBox
          ? createPortal(
              <div
                className="pointer-events-none fixed w-4 -translate-x-1/2 bg-blue-500/50"
                style={{
                  left: indicatorLeft,
                  top: indicatorBox.top,
                  height: indicatorBox.height,
                }}
              />,
              document.body,
            )
          : null}
      </>
    </PaneDragProvider>
  );
};
