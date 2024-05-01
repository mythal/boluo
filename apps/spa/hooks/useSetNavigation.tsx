import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { setHashNavigate } from '../state/view.atoms';

// Use next/navigation instead of direct window.location manipulation
// To avoid some issues in development mode.
export const useSetNavigation = () => {
  const router = useRouter();
  const hashNavigation = useCallback(
    (hash: string) => {
      if (typeof window === 'undefined') {
        return;
      }
      const { pathname, search } = window.location;
      const href = pathname + search + hash ? '#' + hash : '';
      router.push(href);
    },
    [router],
  );
  useEffect(() => {
    setHashNavigate(hashNavigation);
  }, [hashNavigation]);
};
