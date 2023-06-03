import { useCallback, useEffect } from 'react';

export const useOnEsc = (callback: undefined | (() => void)) => {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (callback) {
          callback();
        }
      }
    },
    [callback],
  );

  useEffect(() => {
    if (!callback) {
      return;
    }
    document.addEventListener('keyup', handleKey);
    return () => {
      document.removeEventListener('keyup', handleKey);
    };
  }, [callback, handleKey]);
};
