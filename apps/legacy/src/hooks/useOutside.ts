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
    function (event: MouseEvent) {
      const target = event.target as Element;
      if (!callback || !overlayRef.current || target == null) {
        return;
      } else if (overlayRef.current.contains(target)) {
        return;
      }
      if (triggerRef) {
        if (triggerRef.current == null || triggerRef.current.contains(target)) {
          return;
        }
      }
      callback();
    },
    [overlayRef, triggerRef, callback],
  );

  useEffect(() => {
    if (callback === undefined || !overlayRef.current?.offsetParent) {
      return;
    }
    // Bind the event listener
    document.addEventListener('click', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('click', handleClickOutside);
    };
  });
}
