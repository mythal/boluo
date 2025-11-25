import { type FC, type ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PaneDragContext } from '../../hooks/usePaneDrag';
import { useSetAtom } from 'jotai';
import { focusPaneAtom, panesAtom } from '../../state/view.atoms';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '@boluo/utils/number';
import { type Pane, type PaneData } from '../../state/view.types';
import { type PaneDragContextValue } from '../../hooks/usePaneDrag';
import { findNextPaneKey, type FocusPane } from '../../state/view.atoms';

type DropTarget =
  | { kind: 'insert'; index: number }
  | { kind: 'child'; targetKey: number }
  | { kind: 'none' };

interface DragState {
  key: number;
  pointerId: number;
  dropTarget: DropTarget;
  rects: Map<number, DOMRect>;
  isChild: boolean;
  hasMoved: boolean;
}

interface PaneDragIndicator {
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
  setFocusPane: (focus: FocusPane) => void;
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

const inChildDropZone = (x: number, y: number, rect: DOMRect) => {
  const inHorizontalBand = x >= rect.left + rect.width * 0.2 && x <= rect.right - rect.width * 0.2;
  const inLowerBand = y >= rect.top + rect.height * 0.55 && y <= rect.bottom;
  return inHorizontalBand && inLowerBand;
};

const getDropTarget = (
  x: number,
  y: number,
  panes: Pane[],
  rects: Map<number, DOMRect>,
  draggedKey: number,
  draggingChild: boolean,
): DropTarget => {
  const draggedRect = rects.get(draggedKey);
  if (draggingChild && draggedRect && inChildDropZone(x, y, draggedRect)) {
    return { kind: 'none' };
  }
  for (const pane of panes) {
    if (pane.key === draggedKey) continue;
    if (pane.child) continue;
    const rect = rects.get(pane.key);
    if (!rect) continue;
    // Only treat as child drop when cursor is in lower-middle band to avoid accidental nesting.
    if (inChildDropZone(x, y, rect)) {
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
  // Track pointer and rects so drop targets stay in sync when the viewport moves.
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const registerPaneRef = useCallback((key: number, node: HTMLDivElement | null) => {
    if (node) {
      paneRefs.current.set(key, node);
    } else {
      paneRefs.current.delete(key);
    }
  }, []);
  const measurePaneRects = useCallback(() => {
    const rects = new Map<number, DOMRect>();
    paneRefs.current.forEach((node, key) => {
      if (node) {
        rects.set(key, node.getBoundingClientRect());
      }
    });
    return rects;
  }, []);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const handlePointerDown = useCallback(
    (paneKey: number, isChild: boolean, event: React.PointerEvent<HTMLElement>) => {
      if (!canDrag) return;
      const rects = measurePaneRects();
      if (!rects.has(paneKey)) return;
      const pointerId = event.pointerId;
      const x = event.clientX;
      const y = event.clientY;
      pointerPositionRef.current = { x, y };
      const dropTarget = getDropTarget(x, y, visiblePanes, rects, paneKey, isChild);
      const nextState: DragState = {
        key: paneKey,
        pointerId,
        rects,
        dropTarget,
        isChild,
        hasMoved: false,
      };
      setFocusPane({ key: paneKey, isChild });
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(pointerId);
      dragStateRef.current = nextState;
      setDragState(nextState);
    },
    [canDrag, measurePaneRects, setFocusPane, visiblePanes],
  );

  const isDragging = dragState != null;

  const updateDragStateWithPointer = useCallback(
    (
      pointer: { x: number; y: number } | null,
      markMoved: boolean,
      overrideRects?: Map<number, DOMRect>,
    ) => {
      if (!pointer) return;
      setDragState((prev) => {
        if (!prev) return prev;
        const rects = overrideRects ?? prev.rects;
        const dropTarget = getDropTarget(
          pointer.x,
          pointer.y,
          visiblePanes,
          rects,
          prev.key,
          prev.isChild,
        );
        const nextState = {
          ...prev,
          rects,
          dropTarget,
          hasMoved: markMoved ? true : prev.hasMoved,
        };
        dragStateRef.current = nextState;
        return nextState;
      });
    },
    [visiblePanes],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      const x = event.clientX;
      const y = event.clientY;
      pointerPositionRef.current = { x, y };
      updateDragStateWithPointer({ x, y }, true);
      event.preventDefault();
    };
    const handleUp = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      event.preventDefault();
      setDragState(null);
      dragStateRef.current = null;
      pointerPositionRef.current = null;
      if (state.isChild && !state.hasMoved) return;
      if (visiblePanes.findIndex((pane) => pane.key === state.key) === -1) return;
      let nextFocus: FocusPane | null = null;
      setPanes((prev) => {
        const dropTarget = state.dropTarget;
        if (dropTarget.kind === 'none') return prev;
        const visible = prev.slice(0, maxPane);
        const rest = prev.slice(maxPane);
        const currentFromIndex = visible.findIndex((pane) => pane.key === state.key);
        if (currentFromIndex === -1) return prev;
        if (state.isChild) {
          const hostPane = visible[currentFromIndex];
          if (!hostPane?.child) return prev;
          const nextVisible = [...visible];
          nextVisible[currentFromIndex] = { ...hostPane, child: undefined };
          if (dropTarget.kind === 'child') {
            const targetIndex = nextVisible.findIndex((pane) => pane.key === dropTarget.targetKey);
            if (targetIndex === -1) return prev;
            const targetPane = nextVisible[targetIndex]!;
            if (targetPane.child) return prev;
            nextFocus = { key: dropTarget.targetKey, isChild: true };
            nextVisible[targetIndex] = {
              ...targetPane,
              child: { pane: hostPane.child.pane, ratio: hostPane.child.ratio },
            };
            return [...nextVisible, ...rest];
          }
          // Dropping a child into the main list: detach, assign a new key, and insert as a standalone pane.
          const newKey = findNextPaneKey(prev);
          const toIndex = clamp(dropTarget.index, 0, nextVisible.length);
          nextVisible.splice(toIndex, 0, { ...hostPane.child.pane, key: newKey });
          nextFocus = { key: newKey, isChild: false };
          return [...nextVisible, ...rest];
        }
        if (dropTarget.kind === 'insert') {
          const toIndex = clamp(dropTarget.index, 0, visible.length);
          if (currentFromIndex === toIndex) return prev;
          const nextVisible = move(visible, currentFromIndex, toIndex);
          nextFocus = { key: state.key, isChild: false };
          return [...nextVisible, ...rest];
        }
        let targetIndex = visible.findIndex((pane) => pane.key === dropTarget.targetKey);
        if (targetIndex === -1) return prev;
        if (dropTarget.targetKey === state.key) return prev;
        const nextVisible = [...visible];
        const [draggedPane] = nextVisible.splice(currentFromIndex, 1);
        if (!draggedPane) return prev;
        if (currentFromIndex < targetIndex) {
          targetIndex -= 1;
        }
        const promotedChild = draggedPane.child?.pane;
        if (promotedChild) {
          const promoted: Pane = { ...promotedChild, key: draggedPane.key };
          nextVisible.splice(currentFromIndex, 0, promoted);
          if (currentFromIndex <= targetIndex) {
            targetIndex += 1;
          }
        }
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
        nextFocus = { key: dropTarget.targetKey, isChild: true };
        return [...nextVisible, ...rest];
      });
      if (nextFocus) {
        setFocusPane(nextFocus);
      }
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDragging, maxPane, setFocusPane, setPanes, updateDragStateWithPointer, visiblePanes]);

  useEffect(() => {
    if (!isDragging) return;
    const handleViewportChange = () => {
      const rects = measurePaneRects();
      updateDragStateWithPointer(pointerPositionRef.current, false, rects);
    };
    // Re-measure when scrolling/resize shifts panes (e.g. scrollIntoView).
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [isDragging, measurePaneRects, updateDragStateWithPointer]);

  const indicator = useMemo<PaneDragIndicator | null>(() => {
    if (!dragState) return null;
    if (dragState.isChild && !dragState.hasMoved) return null;
    const dropTarget = dragState.dropTarget;
    if (dropTarget.kind === 'none') return null;
    const rects = dragState.rects;
    const visibleKeys = visiblePanes.map((pane) => pane.key);
    if (dropTarget.kind === 'insert') {
      if (visibleKeys.length === 0) return null;
      const fromIndex = visibleKeys.findIndex((key) => key === dragState.key);
      if (fromIndex !== -1 && !dragState.isChild) {
        // If the drop target is the same as the dragged pane's index, we don't show the indicator.
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

  // Keep the drag context stable during pointer moves; only recreate when the dragged pane identity changes.
  const draggingKey = dragState?.key;
  const draggingIsChild = dragState?.isChild;
  const draggingPane = useMemo(
    () =>
      draggingKey != null && draggingIsChild != null
        ? { key: draggingKey, isChild: draggingIsChild }
        : null,
    [draggingKey, draggingIsChild],
  );
  const dragContextValue = useMemo<PaneDragContextValue>(
    () => ({
      canDrag,
      draggingPane,
      onHandlePointerDown: handlePointerDown,
      registerPaneRef,
    }),
    [canDrag, draggingPane, handlePointerDown, registerPaneRef],
  );

  return { dragContextValue, indicator };
};

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
              className={`bg-brand-strong/40 pointer-events-none fixed ${indicator.kind === 'insert' ? '-translate-x-1/2' : 'rounded-sm'}`}
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
