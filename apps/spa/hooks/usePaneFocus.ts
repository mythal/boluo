import { useStore } from 'jotai';
import { type RefObject, useCallback, useContext } from 'react';
import { focusPaneAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';
import { useIsChildPane } from './useIsChildPane';

const isPaneVisible = (paneBox: HTMLElement, container: Element | null) => {
  const { left, right, top, bottom } = paneBox.getBoundingClientRect();
  if (container) {
    const containerRect = container.getBoundingClientRect();
    return (
      left >= containerRect.left &&
      right <= containerRect.right &&
      top >= containerRect.top &&
      bottom <= containerRect.bottom
    );
  }
  return left >= 0 && right <= window.innerWidth && top >= 0 && bottom <= window.innerHeight;
};

export const scrollPaneIntoView = (paneBox: HTMLElement | null) => {
  if (paneBox == null) return;
  const container = paneBox.closest('.ChatContentBox');
  if (isPaneVisible(paneBox, container)) {
    return;
  }
  paneBox.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
};

export const usePaneFocus = (ref: RefObject<HTMLDivElement | null>) => {
  const store = useStore();
  const { key } = useContext(PaneContext);
  const isChild = useIsChildPane();
  return useCallback(() => {
    if (key == null) {
      return;
    }
    const focus = store.get(focusPaneAtom);
    if (focus?.key !== key || focus?.isChild !== isChild) {
      store.set(focusPaneAtom, { key, isChild });
    }
    scrollPaneIntoView(ref.current);
  }, [isChild, key, ref, store]);
};
