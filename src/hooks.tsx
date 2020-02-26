import React, { useCallback, useEffect } from 'react';

export function useOutside(ref: React.MutableRefObject<HTMLElement | null>, callback: () => void) {
  /**
   * https://stackoverflow.com/a/42234988
   */

  const handleClickOutside = useCallback(
    function(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Element)) {
        callback();
      }
    },
    [ref, callback]
  );

  useEffect(() => {
    if (ref.current?.offsetParent === null) {
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
