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
import { type Pane, type PaneData } from '../state/view.types';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { usePaneLimit } from '../hooks/useMaxPane';
import { createPortal } from 'react-dom';
import { clamp } from '@boluo/utils/number';

interface Props {
  defaultPane?: ReactNode;
}

type DropTarget =
  | { kind: 'insert'; index: number }
  | { kind: 'child'; targetKey: number };

interface DragState {
  key: number;
  pointerId: number;
  dropTarget: DropTarget;
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

const getDropTarget = (
  x: number,
  y: number,
  panes: Pane[],
  rects: Map<number, DOMRect>,
  draggedKey: number,
): DropTarget => {
  for (const pane of panes) {
    if (pane.key === draggedKey) continue;
    if (pane.child) continue;
    const rect = rects.get(pane.key);
    if (!rect) continue;
    const inHorizontalBand =
      x >= rect.left + rect.width * 0.2 && x <= rect.right - rect.width * 0.2;
    const inLowerBand = y >= rect.top + rect.height * 0.55 && y <= rect.bottom;
    if (inHorizontalBand && inLowerBand) {
      return { kind: 'child', targetKey: pane.key };
    }
  }
  const index = getDropIndex(
    x,
    panes.map((pane) => pane.key),
    rects,
  );
  return { kind: 'insert', index };
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
      const y = event.clientY;
      const dropTarget = getDropTarget(x, y, visiblePanes, rects, paneKey);
      setFocusPane(paneKey);
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(pointerId);
      setDragState({ key: paneKey, pointerId, rects, dropTarget });
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
      const y = event.clientY;
      setDragState((state) => {
        if (!state) return state;
        const dropTarget = getDropTarget(x, y, visiblePanes, state.rects, state.key);
        return { ...state, dropTarget };
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
      setPanes((prev) => {
        const dropTarget = state.dropTarget;
        const visible = prev.slice(0, maxPane);
        const rest = prev.slice(maxPane);
        const currentFromIndex = visible.findIndex((pane) => pane.key === state.key);
        if (currentFromIndex === -1) return prev;
        if (dropTarget.kind === 'insert') {
          const toIndex = clamp(dropTarget.index, 0, visible.length);
          if (currentFromIndex === toIndex) return prev;
          const nextVisible = move(visible, currentFromIndex, toIndex);
          return [...nextVisible, ...rest];
        }
        const targetIndex = visible.findIndex((pane) => pane.key === dropTarget.targetKey);
        if (targetIndex === -1) return prev;
        if (dropTarget.targetKey === state.key) return prev;
        const nextVisible = [...visible];
        const [draggedPane] = nextVisible.splice(currentFromIndex, 1);
        if (!draggedPane) return prev;
        const nextTargetIndex = nextVisible.findIndex((pane) => pane.key === dropTarget.targetKey);
        if (nextTargetIndex === -1) return prev;
        const targetPane = nextVisible[nextTargetIndex]!;
        if (targetPane.child) return prev;
        const { key, child, ...paneData } = draggedPane;
        const childPane = paneData as PaneData;
        nextVisible[nextTargetIndex] = {
          ...targetPane,
          child: { pane: childPane, ratio: '1/2' },
        };
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

  const indicator = useMemo(() => {
    if (!dragState) return null;
    const dropTarget = dragState.dropTarget;
    const rects = dragState.rects;
    const visibleKeys = visiblePanes.map((pane) => pane.key);
    if (dropTarget.kind === 'insert') {
      if (visibleKeys.length === 0) return null;
      const fromIndex = visibleKeys.findIndex((key) => key === dragState.key);
      if (fromIndex !== -1) {
        if (
          dropTarget.index === fromIndex ||
          dropTarget.index === fromIndex + 1
        ) {
          return null;
        }
      }
      const rectList = visibleKeys
        .map((key) => rects.get(key))
        .filter((rect): rect is DOMRect => !!rect);
      if (rectList.length === 0) return null;
      const top = Math.min(...rectList.map((rect) => rect.top));
      const bottom = Math.max(...rectList.map((rect) => rect.bottom));
      let left: number | null = null;
      if (dropTarget.index <= 0) {
        const firstRect = rects.get(visibleKeys[0]!);
        left = firstRect ? firstRect.left : null;
      } else if (dropTarget.index >= visibleKeys.length) {
        const lastRect = rects.get(visibleKeys[visibleKeys.length - 1]!);
        left = lastRect ? lastRect.right : null;
      } else {
        const prevRect = rects.get(visibleKeys[dropTarget.index - 1]!);
        left = prevRect ? prevRect.right : null;
      }
      if (left == null) return null;
      return { top, height: bottom - top, left, width: 8, kind: 'insert' as const };
    }
    const rect = rects.get(dropTarget.targetKey);
    if (!rect) return null;
    const halfHeight = rect.height / 2;
    return {
      top: rect.top + halfHeight,
      height: halfHeight,
      left: rect.left,
      width: rect.width,
      kind: 'child' as const,
    };
  }, [dragState, visiblePanes]);

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
