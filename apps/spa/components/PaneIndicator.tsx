import { useAtomValue, useStore } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { focusPaneAtom, panesAtom } from '../state/view.atoms';
import { isSidebarExpandedAtom } from '../state/ui.atoms';

const DISPLAY_DURATION = 1000;

export const PaneIndicator = () => {
  const panes = useAtomValue(panesAtom);
  const focusPane = useAtomValue(focusPaneAtom);
  const isSidebarExpanded = useAtomValue(isSidebarExpandedAtom);
  const store = useStore();
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);
  const prevCount = useRef<number | null>(null);
  const prevFocus = useRef<{ key: number | null; isChild: boolean } | null>(null);

  const showTemporarily = useCallback((paneCount: number) => {
    if (paneCount <= 1) {
      setVisible(false);
      return;
    }
    window.clearTimeout(timeoutRef.current);
    setVisible(true);
    timeoutRef.current = window.setTimeout(() => setVisible(false), DISPLAY_DURATION);
  }, []);

  useEffect(() => {
    const unsubscribePanes = store.sub(panesAtom, () => {
      const nextCount = store.get(panesAtom).length;
      if (nextCount <= 1) {
        setVisible(false);
        prevCount.current = nextCount;
        return;
      }
      if (prevCount.current === null || prevCount.current !== nextCount) {
        showTemporarily(nextCount);
      }
      prevCount.current = nextCount;
    });
    const unsubscribeFocus = store.sub(focusPaneAtom, () => {
      const nextCount = store.get(panesAtom).length;
      const nextFocus = store.get(focusPaneAtom);
      if (nextCount <= 1) {
        prevFocus.current = nextFocus;
        return;
      }
      const prev = prevFocus.current;
      if (prev?.key !== nextFocus?.key) {
        showTemporarily(nextCount);
      }
      prevFocus.current = nextFocus;
    });
    return () => {
      unsubscribePanes();
      unsubscribeFocus();
    };
  }, [showTemporarily, store]);

  useEffect(() => {
    const handleFocus = () => {
      const paneCount = store.get(panesAtom).length;
      showTemporarily(paneCount);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [showTemporarily, store]);

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  const activeIndex = useMemo(() => {
    if (panes.length === 0) return -1;
    const focusKey = focusPane?.key;
    const index = focusKey != null ? panes.findIndex((pane) => pane.key === focusKey) : -1;
    return index === -1 ? 0 : index;
  }, [focusPane?.key, panes]);

  if (panes.length <= 1) {
    return null;
  }

  return (
    <div
      data-sidebar-expanded={isSidebarExpanded ? 'true' : 'false'}
      className={clsx(
        'pointer-events-none fixed top-8 z-30 -translate-x-1/2 transition-opacity duration-200',
        'data-[sidebar-expanded=false]:left-1/2 data-[sidebar-expanded=true]:left-[calc(50%+var(--spacing-sidebar)/2)]',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="bg-surface-unit/90 border-border-default text-text-primary flex items-center gap-2 rounded-full border px-3 py-2 shadow-md backdrop-blur-sm">
        {panes.map((pane, index) => {
          const isActive = index === activeIndex;
          return (
            <span
              key={pane.key}
              className={clsx(
                'block h-2 w-2 rounded-full transition-all duration-300',
                isActive ? 'bg-brand-strong w-4' : 'bg-surface-muted',
              )}
            />
          );
        })}
      </div>
    </div>
  );
};
