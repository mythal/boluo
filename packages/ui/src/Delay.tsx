import { memo, type ReactNode, useEffect, useState } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
  timeout?: number;
}

// eslint-disable-next-line react/prop-types
export const Delay = memo<Props>(({ fallback = null, children, timeout = 64 }: Props) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const callback = () => {
      setShow(true);
    };
    if (window.requestIdleCallback !== undefined) {
      const handle = requestIdleCallback(callback);
      return () => cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(callback, timeout);
      return () => window.clearTimeout(handle);
    }
  }, [timeout]);

  return show ? children : fallback;
});
Delay.displayName = 'Delay';
