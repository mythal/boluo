import {
  autoUpdate,
  offset,
  type Placement,
  type ReferenceType,
  shift,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type React from 'react';
import { useCallback, useState } from 'react';
import { type FloatingSetters, useFloatingSetters } from './useFloatingSetters';

type UseInteractionsReturn = ReturnType<typeof useInteractions>;

interface UseTooltipReturn extends FloatingSetters<ReferenceType> {
  showTooltip: boolean;
  floatingStyles: React.CSSProperties;
  getReferenceProps: UseInteractionsReturn['getReferenceProps'];
  getFloatingProps: UseInteractionsReturn['getFloatingProps'];
  dismiss: () => void;
}

export const useTooltip = (
  placement: Placement = 'bottom',
  offsetMount: number = 4,
): UseTooltipReturn => {
  const [showTooltip, setShowTooltip] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: showTooltip,
    onOpenChange: setShowTooltip,
    middleware: [shift({ padding: offsetMount }), offset({ mainAxis: offsetMount })],
    placement,
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { restMs: 200, move: false });
  const dismiss = useDismiss(context, {});
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);
  const { setReference, setFloating } = useFloatingSetters(refs);
  return {
    showTooltip,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
    setReference,
    setFloating,
    dismiss: useCallback(() => setShowTooltip(false), []),
  };
};
