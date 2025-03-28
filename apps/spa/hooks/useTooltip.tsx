import {
  autoUpdate,
  offset,
  type Placement,
  shift,
  useDismiss,
  useFloating,
  type UseFloatingReturn,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type React from 'react';
import { useCallback, useState } from 'react';

type UseInteractionsReturn = ReturnType<typeof useInteractions>;

interface UseTooltipReturn {
  showTooltip: boolean;
  floatingStyles: React.CSSProperties;
  getReferenceProps: UseInteractionsReturn['getReferenceProps'];
  getFloatingProps: UseInteractionsReturn['getFloatingProps'];
  refs: UseFloatingReturn['refs'];
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

  const hover = useHover(context, { restMs: 50, move: false });
  const dismiss = useDismiss(context, {});
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);
  return {
    showTooltip,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
    refs,
    dismiss: useCallback(() => setShowTooltip(false), []),
  };
};
