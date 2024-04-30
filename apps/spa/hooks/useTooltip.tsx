import {
  autoUpdate,
  Placement,
  shift,
  useDismiss,
  useFloating,
  UseFloatingReturn,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import React, { useState } from 'react';

type UseInteractionsReturn = ReturnType<typeof useInteractions>;

interface UseTooltipReturn {
  showTooltip: boolean;
  floatingStyles: React.CSSProperties;
  getReferenceProps: UseInteractionsReturn['getReferenceProps'];
  getFloatingProps: UseInteractionsReturn['getFloatingProps'];
  refs: UseFloatingReturn['refs'];
}

export const useTooltip = (placement: Placement = 'bottom'): UseTooltipReturn => {
  const [showTooltip, setShowTooltip] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: showTooltip,
    onOpenChange: setShowTooltip,
    middleware: [shift()],
    placement,
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {});
  const dismiss = useDismiss(context, {});
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role]);
  return {
    showTooltip,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
    refs,
  };
};
