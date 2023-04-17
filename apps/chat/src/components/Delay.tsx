import { memo, ReactNode, useEffect, useRef, useState } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
  timeout?: number;
}

export const Delay = memo<Props>(({ fallback = null, children, timeout = 64 }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setShow(true);
    }, timeout);
    return () => window.clearTimeout(handle);
  }, [timeout]);

  return <>{show ? children : fallback}</>;
});
Delay.displayName = 'Delay';
