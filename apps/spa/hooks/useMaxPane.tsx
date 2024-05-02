import { useBreakpoint } from '../breakpoint';

export const usePaneLimit = () => {
  const breakpoint = useBreakpoint();
  if (breakpoint === 'xs' || breakpoint === 'sm') {
    return 1;
  } else {
    return 10;
  }
};
