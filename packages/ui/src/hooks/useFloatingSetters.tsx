import type { ExtendedRefs, ReferenceType } from '@floating-ui/react';
import { useMemo } from 'react';

export interface FloatingSetters<RT extends ReferenceType> {
  setReference: (node: RT | null) => void;
  setFloating: (node: HTMLElement | null) => void;
}

/**
 * Extract `setReference`/`setFloating` from floating-ui's `refs` object.
 *
 * Reading `refs.setReference` during render trips `react-hooks/refs`, which
 * treats the whole `refs` object as a ref. The setters here are plain stable
 * functions that are safe to pass to `ref` props.
 */
export function useFloatingSetters<RT extends ReferenceType>(
  refs: ExtendedRefs<RT>,
): FloatingSetters<RT> {
  return useMemo(
    () => ({
      setReference: (node) => refs.setReference(node),
      setFloating: (node) => refs.setFloating(node),
    }),
    [refs],
  );
}
