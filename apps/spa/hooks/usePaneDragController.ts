import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clamp } from '@boluo/utils/number';
import { type Pane, type PaneData } from '../state/view.types';
import { type PaneDragContextValue } from './usePaneDrag';

type DropTarget =
  | { kind: 'insert'; index: number }
  | { kind: 'child'; targetKey: number };

interface DragState {
  key: number;
  pointerId: number;
  dropTarget: DropTarget;
  rects: Map<number, DOMRect>;
}

export interface PaneDragIndicator {
  left: number;
  top: number;
  height: number;
  width: number;
  kind: 'insert' | 'child';
}

interface Args {
  visiblePanes: Pane[];
  maxPane: number;
  canDrag: boolean;
  setPanes: (fn: (prev: Pane[]) => Pane[]) => void;
  setFocusPane: (key: number) => void;
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
    // Only treat as child drop when cursor is in lower-middle band to avoid accidental nesting.
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

export const usePaneDragController = ({
  visiblePanes,
  maxPane,
  canDrag,
  setPanes,
  setFocusPane,
}: Args) => {
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
    (paneKey: number, event: React.PointerEvent<HTMLElement>) => {
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
      setDragState((prev) => {
        if (!prev) return prev;
        const dropTarget = getDropTarget(x, y, visiblePanes, prev.rects, prev.key);
        return { ...prev, dropTarget };
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

  const indicator = useMemo<PaneDragIndicator | null>(() => {
    if (!dragState) return null;
    const dropTarget = dragState.dropTarget;
    const rects = dragState.rects;
    const visibleKeys = visiblePanes.map((pane) => pane.key);
    if (dropTarget.kind === 'insert') {
      if (visibleKeys.length === 0) return null;
      const fromIndex = visibleKeys.findIndex((key) => key === dragState.key);
      if (fromIndex !== -1) {
        if (dropTarget.index === fromIndex || dropTarget.index === fromIndex + 1) {
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
      return { top, height: bottom - top, left, width: 8, kind: 'insert' };
    }
    const rect = rects.get(dropTarget.targetKey);
    if (!rect) return null;
    const halfHeight = rect.height / 2;
    return {
      top: rect.top + halfHeight,
      height: halfHeight,
      left: rect.left,
      width: rect.width,
      kind: 'child',
    };
  }, [dragState, visiblePanes]);

  const draggingKey = dragState?.key ?? null;
  const dragContextValue = useMemo<PaneDragContextValue>(
    () => ({
      canDrag,
      draggingKey,
      onHandlePointerDown: handlePointerDown,
      registerPaneRef,
    }),
    [canDrag, draggingKey, handlePointerDown, registerPaneRef],
  );

  return { dragContextValue, indicator };
};
