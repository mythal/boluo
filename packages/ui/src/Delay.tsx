import { type ReactNode, Suspense, useEffect, useState, createContext, useContext } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  suspense?: boolean;
}

export const DisableDelay = createContext(false);

export const Delay = ({ fallback, children, suspense = false }: Props) => {
  const [showState, setShowState] = useState(false);
  const disableDelay = useContext(DisableDelay);
  const show = disableDelay ? true : showState;
  useEffect(() => {
    if (disableDelay) {
      return;
    }
    const callback = () => {
      setShowState(true);
    };
    if (window.requestIdleCallback !== undefined) {
      const handle = requestIdleCallback(callback);
      return () => cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(callback, 64);
      return () => window.clearTimeout(handle);
    }
  }, [disableDelay]);

  if (suspense) {
    return <Suspense fallback={fallback}>{show ? children : fallback}</Suspense>;
  }

  return show ? children : fallback;
};
