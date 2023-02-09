import type React from 'react';
import { useCallback, useEffect } from 'react';

export function useOutside(
  callback: (() => void) | undefined,
  overlayRef: React.RefObject<HTMLElement | null>,
  triggerRef?: React.RefObject<HTMLElement | null>,
) {
  /**
   * https://stackoverflow.com/a/42234988
   */

  const handleClickOutside = useCallback(
    function(event: MouseEvent) {
      if (!callback || !overlayRef.current || !event.target) {
        return;
      }
      const target = event.target;
      if (target instanceof Node) {
        if (overlayRef.current.contains(target)) {
          return;
        }
        if (triggerRef?.current?.contains(target)) {
          return;
        }
      }
      callback();
    },
    [overlayRef, triggerRef, callback],
  );

  useEffect(() => {
    if (callback === undefined) {
      return;
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
}
